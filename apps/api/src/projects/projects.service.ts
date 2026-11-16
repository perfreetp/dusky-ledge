import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  InspectionResult,
  ProjectDto,
  ProjectRules,
  ProjectVersionDto,
  SplineModel,
} from '@pg/shared';
import { runPipeline } from '@pg/geom-kernel';
import { buildEnvelopes, type RobotConfig } from '@pg/robot';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateProjectDto, SaveVersionDto } from './dto.js';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class ProjectsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private toProjectDto(row: {
    id: string;
    name: string;
    code: string;
    robotConfigId: string;
    status: string;
    rulesJson: string;
    currentVersion: number;
    createdAt: Date;
    updatedAt: Date;
  }): ProjectDto {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      robotConfigId: row.robotConfigId,
      status: row.status as ProjectDto['status'],
      rules: JSON.parse(row.rulesJson) as ProjectRules,
      currentVersion: row.currentVersion,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(): Promise<ProjectDto[]> {
    const rows = await this.prisma.project.findMany({ orderBy: { updatedAt: 'desc' } });
    return rows.map((r) => this.toProjectDto(r));
  }

  async detail(id: string): Promise<ProjectDto> {
    const row = await this.prisma.project.findUniqueOrThrow({ where: { id } });
    return this.toProjectDto(row);
  }

  async create(dto: CreateProjectDto): Promise<ProjectDto> {
    const exists = await this.prisma.project.findUnique({ where: { code: dto.code } });
    if (exists) throw new BadRequestException('项目编号已存在');
    await this.prisma.robotConfig.findUniqueOrThrow({ where: { id: dto.robotConfigId } });
    const row = await this.prisma.project.create({
      data: {
        name: dto.name,
        code: dto.code,
        robotConfigId: dto.robotConfigId,
        rulesJson: JSON.stringify(dto.rules),
      },
    });
    return this.detail(row.id);
  }

  async listVersions(projectId: string): Promise<ProjectVersionDto[]> {
    const rows = await this.prisma.projectVersion.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
    });
    return rows.map((r) => this.toVersionDto(r));
  }

  async getVersion(projectId: string, version: number): Promise<ProjectVersionDto> {
    const row = await this.prisma.projectVersion.findUniqueOrThrow({
      where: { projectId_version: { projectId, version } },
    });
    return this.toVersionDto(row);
  }

  private toVersionDto(r: {
    id: string;
    projectId: string;
    version: number;
    changeNote: string;
    modelJson: string;
    inspectionJson: string | null;
    createdById: string;
    createdAt: Date;
  }): ProjectVersionDto {
    return {
      id: r.id,
      projectId: r.projectId,
      version: r.version,
      changeNote: r.changeNote,
      model: JSON.parse(r.modelJson) as SplineModel,
      inspection: r.inspectionJson ? (JSON.parse(r.inspectionJson) as InspectionResult) : null,
      createdBy: r.createdById,
      createdAt: r.createdAt.toISOString(),
    };
  }

  /** 保存版本：服务端复算几何检查，保证审查数据可信 */
  async saveVersion(
    projectId: string,
    dto: SaveVersionDto,
    userId: string,
  ): Promise<ProjectVersionDto> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    if (dto.model.controlPoints.length < 2) {
      throw new BadRequestException('至少需要 2 个控制点');
    }

    const robotRow = await this.prisma.robotConfig.findUnique({
      where: { id: project.robotConfigId },
    });
    const robotConfig = robotRow ? (JSON.parse(robotRow.configJson) as RobotConfig) : null;
    const envelopes = robotConfig
      ? buildEnvelopes(robotConfig, dto.model.jointAngles)
      : undefined;

    const result = runPipeline({
      controlPoints: dto.model.controlPoints,
      interpolation: dto.model.interpolation,
      rules: dto.model.rules,
      projectCode: project.code,
      envelopes,
    });

    return this.prisma.$transaction(async (tx) => {
      const nextVersion = project.currentVersion + 1;
      const saved = await tx.projectVersion.create({
        data: {
          projectId,
          version: nextVersion,
          changeNote: dto.changeNote ?? '',
          modelJson: JSON.stringify(dto.model),
          inspectionJson: JSON.stringify(result.inspection),
          createdById: userId,
        },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { currentVersion: nextVersion, rulesJson: JSON.stringify(dto.model.rules) },
      });

      for (const stat of result.inspection.segmentStats) {
        await tx.segmentStat.upsert({
          where: {
            projectId_version_segmentId: {
              projectId,
              version: nextVersion,
              segmentId: stat.segmentId,
            },
          },
          create: {
            projectId,
            version: nextVersion,
            segmentId: stat.segmentId,
            segmentName: stat.segmentName,
            jointId: stat.jointId,
            length: stat.length,
            curvatureViolationLength: stat.curvatureViolationLength,
            envelopeViolationLength: stat.envelopeViolationLength,
            maxCurvature: stat.maxCurvature,
          },
          update: {},
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'SAVE_VERSION',
          detail: `${project.code} v${nextVersion}`,
        },
      });
      return this.toVersionDto(saved);
    });
  }

  /** 版本 diff：控制点/权重/插值变化 + 各段长度差 */
  async diff(projectId: string, fromVersion: number, toVersion: number) {
    const [from, to] = await Promise.all([
      this.getVersion(projectId, fromVersion),
      this.getVersion(projectId, toVersion),
    ]);
    const cpA = from.model.controlPoints;
    const cpB = to.model.controlPoints;
    const moved = cpB
      .map((b, i) => {
        const a = cpA[i];
        if (!a) return { controlPointId: b.id, delta: null as number[] | null };
        const delta = [
          b.position[0] - a.position[0],
          b.position[1] - a.position[1],
          b.position[2] - a.position[2],
        ];
        return { controlPointId: b.id, delta };
      })
      .filter((x) => x.delta === null || x.delta.some((d) => Math.abs(d) > 1e-6));

    const weightsChanged = cpB
      .map((b, i) => ({ id: b.id, from: cpA[i]?.weight ?? null, to: b.weight }))
      .filter((x) => x.from === null || Math.abs(x.from - x.to) > 1e-9);

    const segA = from.inspection?.segmentStats ?? [];
    const segB = to.inspection?.segmentStats ?? [];
    const segmentLengthDiff = segB.map((b, i) => ({
      segmentName: b.segmentName,
      from: segA[i]?.length ?? 0,
      to: b.length,
      delta: b.length - (segA[i]?.length ?? 0),
    }));

    return {
      interpolationChanged: from.model.interpolation !== to.model.interpolation,
      fromInterpolation: from.model.interpolation,
      toInterpolation: to.model.interpolation,
      controlPointCount: { from: cpA.length, to: cpB.length },
      movedPoints: moved,
      weightsChanged,
      segmentLengthDiff,
      totalLength: {
        from: from.inspection?.totalLength ?? null,
        to: to.inspection?.totalLength ?? null,
      },
    };
  }
}

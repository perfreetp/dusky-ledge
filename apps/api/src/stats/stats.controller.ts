import { Controller, Get, Inject, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('stats')
export class StatsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** 主管看板：每项目版本数、状态、最新总长 */
  @Get('overview')
  async overview() {
    const projects = await this.prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { versions: true } } },
    });
    return projects.map((p) => ({
      projectId: p.id,
      projectName: p.name,
      projectCode: p.code,
      status: p.status,
      versionCount: p._count.versions,
      currentVersion: p.currentVersion,
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /** 单项目各版本各段长度统计（供折线/表格） */
  @Get('projects/:id/segments')
  async segmentStats(@Param('id') id: string) {
    const rows = await this.prisma.segmentStat.findMany({
      where: { projectId: id },
      orderBy: [{ version: 'asc' }, { segmentId: 'asc' }],
    });
    return rows.map((r) => ({
      version: r.version,
      segmentId: r.segmentId,
      segmentName: r.segmentName,
      jointId: r.jointId,
      length: r.length,
      curvatureViolationLength: r.curvatureViolationLength,
      envelopeViolationLength: r.envelopeViolationLength,
      maxCurvature: r.maxCurvature,
    }));
  }

  /** 跨项目汇总：总长与超差长度 */
  @Get('summary')
  async summary() {
    const grouped = await this.prisma.segmentStat.groupBy({
      by: ['projectId', 'version'],
      _sum: { length: true, curvatureViolationLength: true, envelopeViolationLength: true },
    });
    const projects = await this.prisma.project.findMany({
      select: { id: true, code: true, name: true },
    });
    const nameMap = new Map(projects.map((p) => [p.id, p]));
    return grouped.map((g) => ({
      projectId: g.projectId,
      projectCode: nameMap.get(g.projectId)?.code ?? g.projectId,
      projectName: nameMap.get(g.projectId)?.name ?? '',
      version: g.version,
      totalLength: g._sum.length ?? 0,
      curvatureViolationLength: g._sum.curvatureViolationLength ?? 0,
      envelopeViolationLength: g._sum.envelopeViolationLength ?? 0,
    }));
  }
}

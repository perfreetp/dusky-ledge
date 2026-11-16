import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { ReviewRecordDto, ReviewStatus } from '@pg/shared';
import { Roles } from '../auth/auth.decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReviewActionDto } from '../projects/dto.js';

interface AuthedReq {
  user: { sub: string; username: string; role: string };
}

@Controller('reviews')
export class ReviewsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** 主管审查队列：所有 submitted 项目的最新版本 */
  @Roles('supervisor', 'admin')
  @Get('queue')
  async queue() {
    const projects = await this.prisma.project.findMany({
      where: { status: 'submitted' },
      orderBy: { updatedAt: 'desc' },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    return projects.map((p) => ({
      projectId: p.id,
      projectName: p.name,
      projectCode: p.code,
      version: p.currentVersion,
      latest: p.versions[0]
        ? {
            changeNote: p.versions[0].changeNote,
            inspection: p.versions[0].inspectionJson
              ? JSON.parse(p.versions[0].inspectionJson)
              : null,
            createdAt: p.versions[0].createdAt.toISOString(),
          }
        : null,
    }));
  }

  /** 工程师提交审查（状态机 draft/rejected → submitted） */
  @Roles('engineer', 'admin')
  @Post(':id/submit')
  async submit(@Param('id') id: string, @Req() req: AuthedReq) {
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id } });
    if (project.currentVersion === 0) {
      throw new BadRequestException('请先保存至少一个版本再提交审查');
    }
    const updated = await this.prisma.project.update({
      where: { id },
      data: { status: 'submitted' },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: req.user.sub,
        action: 'SUBMIT_REVIEW',
        detail: `${project.code} v${project.currentVersion}`,
      },
    });
    return { status: updated.status as ReviewStatus };
  }

  @Roles('supervisor', 'admin')
  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() dto: ReviewActionDto,
    @Req() req: AuthedReq,
  ): Promise<ReviewRecordDto> {
    return this.recordReview(id, 'approved', dto.comment, req);
  }

  @Roles('supervisor', 'admin')
  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() dto: ReviewActionDto,
    @Req() req: AuthedReq,
  ): Promise<ReviewRecordDto> {
    return this.recordReview(id, 'rejected', dto.comment, req);
  }

  @Get(':id/records')
  async records(@Param('id') id: string): Promise<ReviewRecordDto[]> {
    const rows = await this.prisma.reviewRecord.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      version: r.version,
      status: r.status as ReviewStatus,
      comment: r.comment,
      reviewerName: r.reviewerName,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  private async recordReview(
    projectId: string,
    status: 'approved' | 'rejected',
    comment: string,
    req: AuthedReq,
  ): Promise<ReviewRecordDto> {
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    const reviewer = await this.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.reviewRecord.create({
        data: {
          projectId,
          version: project.currentVersion,
          status,
          comment,
          reviewerId: reviewer.id,
          reviewerName: reviewer.displayName,
        },
      });
      await tx.project.update({ where: { id: projectId }, data: { status } });
      await tx.auditLog.create({
        data: {
          actorId: reviewer.id,
          action: status === 'approved' ? 'APPROVE' : 'REJECT',
          detail: `${project.code} v${project.currentVersion} ${comment}`,
        },
      });
      return {
        id: record.id,
        projectId: record.projectId,
        version: record.version,
        status: record.status as ReviewStatus,
        comment: record.comment,
        reviewerName: record.reviewerName,
        createdAt: record.createdAt.toISOString(),
      };
    });
  }
}

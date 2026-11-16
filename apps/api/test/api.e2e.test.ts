import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type supertest from 'supertest';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { hashPassword } from '../src/auth/password.util.js';
import { DEFAULT_6AXIS_ROBOT } from '@pg/robot';
import { DEFAULT_PROJECT_RULES, type ControlPoint, type SplineModel } from '@pg/shared';

// 动态导入避免装饰器元数据在测试环境缺失
async function createApp() {
  const mod = await import('../src/app.module.js');
  const app = await NestFactory.create(mod.AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.init();
  return app;
}

function demoModel(interpolation: SplineModel['interpolation'] = 'catmullRom'): SplineModel {
  const cps: ControlPoint[] = [
    { id: 'c1', position: [0, 0, 0], weight: 1, jointId: 'J1' },
    { id: 'c2', position: [120, 0, 0], weight: 1, jointId: 'J1' },
    { id: 'c3', position: [220, 90, 0], weight: 1, jointId: 'J2' },
    { id: 'c4', position: [220, 200, 40], weight: 1, jointId: 'J3' },
  ];
  return {
    version: 1,
    name: 'test-model',
    interpolation,
    controlPoints: cps,
    rules: { ...DEFAULT_PROJECT_RULES, tubularSegments: 120, radialSegments: 16 },
    jointAngles: {},
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

describe('API e2e', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let prisma: PrismaService;
  let http: typeof supertest;
  let engineerToken: string;
  let supervisorToken: string;
  let projectId: string;
  let robotId: string;

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
    http = (await import('supertest')).default;

    // 只清理本测试产生的数据，保留 seed 的演示账号与机型
    const staleProjects = await prisma.project.findMany({
      where: { code: 'E2E-001' },
      select: { id: true },
    });
    const staleIds = staleProjects.map((p) => p.id);
    await prisma.reviewRecord.deleteMany({ where: { projectId: { in: staleIds } } });
    await prisma.segmentStat.deleteMany({ where: { projectId: { in: staleIds } } });
    await prisma.projectVersion.deleteMany({ where: { projectId: { in: staleIds } } });
    await prisma.project.deleteMany({ where: { id: { in: staleIds } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'e2e-' } } });

    await prisma.user.create({
      data: {
        username: 'e2e-engineer',
        displayName: 'E2E 工程师',
        role: 'engineer',
        passwordHash: hashPassword('pass1234'),
      },
    });
    await prisma.user.create({
      data: {
        username: 'e2e-super',
        displayName: 'E2E 主管',
        role: 'supervisor',
        passwordHash: hashPassword('pass1234'),
      },
    });
    robotId = (
      (await prisma.robotConfig.findUnique({ where: { code: DEFAULT_6AXIS_ROBOT.id } })) ??
      (await prisma.robotConfig.create({
        data: {
          code: DEFAULT_6AXIS_ROBOT.id,
          name: DEFAULT_6AXIS_ROBOT.name,
          configJson: JSON.stringify(DEFAULT_6AXIS_ROBOT),
        },
      }))
    ).id;

    const login = async (username: string) => {
      const res = await http(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username, password: 'pass1234' });
      expect(res.status).toBe(201);
      return res.body.token as string;
    };
    engineerToken = await login('e2e-engineer');
    supervisorToken = await login('e2e-super');
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated access', async () => {
    const res = await http(app.getHttpServer()).get('/api/projects');
    expect(res.status).toBe(401);
  });

  it('engineer creates project and saves two versions', async () => {
    const create = await http(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({
        name: 'E2E 护套项目',
        code: 'E2E-001',
        robotConfigId: robotId,
        rules: DEFAULT_PROJECT_RULES,
      });
    expect(create.status).toBe(201);
    projectId = create.body.id;

    const v1 = await http(app.getHttpServer())
      .post(`/api/projects/${projectId}/versions`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ model: demoModel(), changeNote: '初版' });
    expect(v1.status).toBe(201);
    expect(v1.body.version).toBe(1);
    expect(v1.body.inspection.totalLength).toBeGreaterThan(200);
    expect(v1.body.inspection.segmentStats.length).toBe(3);

    const v2 = await http(app.getHttpServer())
      .post(`/api/projects/${projectId}/versions`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ model: demoModel('nurbs'), changeNote: '改 NURBS' });
    expect(v2.status).toBe(201);
    expect(v2.body.version).toBe(2);

    const versions = await http(app.getHttpServer())
      .get(`/api/projects/${projectId}/versions`)
      .set('Authorization', `Bearer ${engineerToken}`);
    expect(versions.body).toHaveLength(2);
  });

  it('returns diff between versions', async () => {
    const res = await http(app.getHttpServer())
      .get(`/api/projects/${projectId}/diff?from=1&to=2`)
      .set('Authorization', `Bearer ${engineerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.interpolationChanged).toBe(true);
    expect(res.body.segmentLengthDiff.length).toBe(3);
  });

  it('review state machine: submit → approve', async () => {
    const submit = await http(app.getHttpServer())
      .post(`/api/reviews/${projectId}/submit`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({});
    expect(submit.status).toBe(201);
    expect(submit.body.status).toBe('submitted');

    const queue = await http(app.getHttpServer())
      .get('/api/reviews/queue')
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(queue.body.some((p: { projectId: string }) => p.projectId === projectId)).toBe(true);

    const approve = await http(app.getHttpServer())
      .post(`/api/reviews/${projectId}/approve`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ comment: '曲率与间隙合格，同意' });
    expect(approve.status).toBe(201);
    expect(approve.body.status).toBe('approved');
  });

  it('engineer cannot access supervisor queue (RBAC)', async () => {
    const res = await http(app.getHttpServer())
      .get('/api/reviews/queue')
      .set('Authorization', `Bearer ${engineerToken}`);
    expect(res.status).toBe(401);
  });

  it('stats overview and segment aggregation are populated', async () => {
    const overview = await http(app.getHttpServer())
      .get('/api/stats/overview')
      .set('Authorization', `Bearer ${supervisorToken}`);
    const row = overview.body.find((x: { projectId: string }) => x.projectId === projectId);
    expect(row.versionCount).toBe(2);

    const segs = await http(app.getHttpServer())
      .get(`/api/stats/projects/${projectId}/segments`)
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(segs.body.length).toBeGreaterThanOrEqual(6); // 2 版本 × 3 段
  });

  it('server-side inspection endpoint recomputes results', async () => {
    const res = await http(app.getHttpServer())
      .post('/api/inspection')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ model: demoModel(), robotConfig: DEFAULT_6AXIS_ROBOT });
    expect(res.status).toBe(201);
    expect(res.body.totalLength).toBeGreaterThan(0);
    expect(Array.isArray(res.body.segmentStats)).toBe(true);
  });
});

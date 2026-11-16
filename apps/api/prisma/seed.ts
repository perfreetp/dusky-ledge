import { PrismaClient } from '@prisma/client';
import { DEFAULT_6AXIS_ROBOT } from '@pg/robot';
import { DEFAULT_PROJECT_RULES } from '@pg/shared';
import { hashPassword } from '../src/auth/password.util.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // 机器人配置
  const robot = await prisma.robotConfig.upsert({
    where: { code: DEFAULT_6AXIS_ROBOT.id },
    update: {},
    create: {
      code: DEFAULT_6AXIS_ROBOT.id,
      name: DEFAULT_6AXIS_ROBOT.name,
      configJson: JSON.stringify(DEFAULT_6AXIS_ROBOT),
    },
  });

  // 演示账号
  const accounts = [
    { username: 'engineer', displayName: '李工（设计工程师）', role: 'engineer', password: 'engineer123' },
    { username: 'supervisor', displayName: '王主管', role: 'supervisor', password: 'super1234' },
    { username: 'admin', displayName: '系统管理员', role: 'admin', password: 'admin1234' },
  ];
  for (const a of accounts) {
    await prisma.user.upsert({
      where: { username: a.username },
      update: {},
      create: {
        username: a.username,
        displayName: a.displayName,
        role: a.role,
        passwordHash: hashPassword(a.password),
      },
    });
  }

  // 示例项目
  const demoCode = 'DEMO-LINE-01';
  const existing = await prisma.project.findUnique({ where: { code: demoCode } });
  if (!existing) {
    await prisma.project.create({
      data: {
        name: '一号产线机器人管线包护套',
        code: demoCode,
        robotConfigId: robot.id,
        rulesJson: JSON.stringify(DEFAULT_PROJECT_RULES),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('[seed] done: engineer/engineer123, supervisor/super1234, admin/admin1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

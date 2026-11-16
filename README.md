# 机器人管线包护套曲面建模工具

面向智慧工厂非标产线的机器人管线包（线缆护套）设计平台：在三维场景中沿机器人各轴布置线缆走向，
实时做曲率/层间隙/关节活动范围检查，把护套曲面展开为平面下料图交付车间，并由主管在后台完成
版本审查与分段长度统计。

## 技术栈

- 几何内核 `packages/geom-kernel`：纯 TypeScript、零渲染依赖、Vitest 黄金值覆盖
- 机器人运动学 `packages/robot`：6 轴改进 DH 正解、关节活动包络
- 导出 `packages/export`：DXF(R12) / SVG 下料图
- 前端 `apps/web`：Vue 3 + Pinia + Element Plus + Three.js（WebGPU 优先，自动回退 WebGL2）+ ECharts
- 后端 `apps/api`：NestJS + Prisma + JWT(RBAC)，本地 SQLite，可切 PostgreSQL

## 目录

```
packages/
  shared/        跨端类型与枚举（SplineModel / InspectionResult / DTO）
  geom-kernel/   样条、平行传输标架、曲率梳、等距双层管、间隙、关节包络、分段、曲面展开
  robot/         6 轴机器人配置、FK、包络生成
  export/        DXF / SVG 写出与浏览器下载
apps/
  web/           三维编辑器、下料图、审查、看板、管理页
  api/           认证、项目、版本快照、审查状态机、统计、服务端几何复算
scripts/
  smoke-api.sh   后端 HTTP 端到端冒烟
```

## 快速开始（本地零外部依赖，SQLite）

```bash
pnpm install
# 1. 编译库包（Node 侧消费 CJS dist；Vite 侧直接吃 TS 源码）
pnpm -r --filter './packages/**' build
# 2. 初始化数据库并写入演示数据
pnpm db:push
pnpm db:seed
# 3. 启动后端（http://localhost:3000/api）
pnpm dev:api
# 4. 另开终端启动前端（http://localhost:5173，被占用会自动换端口）
pnpm dev:web
```

演示账号：

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 设计工程师 | engineer | engineer123 |
| 主管 | supervisor | super1234 |
| 管理员 | admin | admin1234 |

## 测试与构建

```bash
pnpm test                 # 全部 48+ 单测/e2e（geom 25、robot 7、export 3、web 6、api 7）
bash scripts/smoke-api.sh # 需先启动 API，跑登录→版本→审查→统计→复算全链路
pnpm --filter @pg/web build   # 前端类型检查 + 生产构建
pnpm --filter @pg/api build   # 后端编译
```

## 关键设计决策

- **几何计算全部在 CPU 纯函数内核**，WebGPU 只负责渲染：算法可单测、可在服务端复算，
  保证主管审查看到的检查结果可信且与客户端版本无关。
- **平行传输标架（RMF）** 而非 Frenet 标架，避免拐点处法向翻转导致管面扭转。
- **曲率超差语义**：弯曲半径 R < `bendRadiusFactor × 外径` 的连续区段标红，输出 t 范围、
  长度、最大曲率，提示护套会打折/降级；阈值在项目规则中可调。
- **等距双层**：内半径 = D/2 − 壁厚；实测最小层间隙低于规则值时弹出数字徽标；
  弯段 R < 内半径判定内偏置自交、无法成型。
- **曲面展开 v1**：母线实长法，环向 r·θ、纵向沿每条母线累积真实边长，弯管内外侧自然形成
  梯形补偿；单测断言展开面积与三维管侧面积误差 < 1%。复杂褶皱场景留 v2 LSCM。
- **关节活动范围**：每关节一个圆柱包络（半径/半长可配），样条采样点落在包络外的连续子区段
  高亮并给出 t 范围与长度；预留极限姿态复检 `checkAtLimitPoses` 扩展点。

## 切换 PostgreSQL

编辑 `apps/api/prisma/schema.prisma`：`provider = "postgresql"`，
`.env` 的 `DATABASE_URL` 改为 PG 连接串，然后 `pnpm db:push`（或 `prisma migrate dev`）。
JSON 字段当前以文本存取，切 PG 后可迁移为原生 Json 类型。

## 已知边界 / 后续

- 机器人为配置化通用 6 轴占位机型；数据结构已预留 URDF 导入。
- 展开为母线实长法 v1，未做弹性优化（LSCM 留 v2）。
- 几何重建当前在主线程防抖执行，密集采样下可迁 Web Worker / WGSL compute。
- 导出文件客户端生成，v1 不落服务器对象存储。

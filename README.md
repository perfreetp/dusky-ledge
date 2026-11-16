# 深远海养殖平台 · 三维总图浏览与图层管理系统

基于 **Svelte 5 + three.js + TypeScript + Vite** 的深海养殖区三维总图系统。单个养殖区项目含
**12,065 个要素**（网箱 9,072 / 锚链 1,296 / 浮标 1,524 / 航标 156 / 警戒区 14 / 航道 3），
全部走 `InstancedMesh` 实例化绘制。

## 启动

```bash
npm install
npm run dev        # 开发服务器
npm run build      # 生产构建
npm run preview    # 预览构建产物
```

## 测试

```bash
npm run check      # svelte-check 类型检查（0 error）
npm run test:unit  # 70 项纯逻辑单测（生成/剔除/LOD/流程/打包）
npm run test:smoke # 无头 Chrome CDP 全链路冒烟（需先 build + preview）
```

## 需求与实现对照

| 需求 | 实现 |
| --- | --- |
| 上万网箱/浮标/锚链/航标实例化绘制 | 6 类要素 × 3 LOD = 18 个实例化桶，单位几何体 + 每实例矩阵缩放 |
| 相机移动按视锥剔除 | 每帧 `Frustum.intersectsSphere`（预计算包围球，TypedArray 并行数组），视口外不进桶 |
| 按距离三档细节 | ≤450m 完整网格；450–1500m 简化网衣；>1500m 仅包围盒线框（`src/lib/config.ts` LOD） |
| 点选高亮描边 + 编号/投放日期弹窗 | 实例化射线拾取 → 独立描边盒 InstancedMesh + 要素信息卡 |
| 框选一片改图层归属 | 屏幕矩形反投影筛选视口内要素，批量写入 `layerOverrides` 并持久化 |
| 网箱/锚链/警戒区/航道四图层独立开关 | 图层开关在剔除阶段生效，关闭图层 `visible=0`，不进桶不参与拾取 |
| 半透明网衣按深度排序不串色 | 透明材质 `depthWrite:false`，透明桶按相机距离背向→前向排序渲染 |
| 双击相机飞行定位 | `easeOutCubic` 1.1s 相机+目标点插值动画 |
| 两点量水平距离 | 射线与海底平面求交，忽略高差的 √(Δx²+Δz²) |
| 一个养殖区一个项目 | 项目元数据存 localStorage；上万要素由种子确定性生成、不入库 |
| 制作员提交 → 主管视口圈位退回写原因 | 双角色切换；退回记录含红圈中心/半径 + 原因，重开项目圈位自动复现 |
| 最多返工 3 次 | 第 3 次退回后项目关闭，禁止再提交（`MAX_REWORK`） |
| 截止前打包交付 | jszip 产出 ZIP：project.json + GeoJSON 全量要素 + reworks.json + manifest + README，超期禁止交付 |

## 目录结构

```
src/
├── lib/
│   ├── config.ts              图层/LOD/场景常量
│   ├── types.ts               领域模型
│   ├── data/
│   │   ├── generator.ts       确定性种子生成上万要素
│   │   ├── store.ts           项目持久化与提交/退回/通过状态机
│   │   └── exporter.ts        jszip 打包 + GeoJSON 导出
│   ├── three/
│   │   ├── geometry.ts        各 LOD 单位几何体
│   │   ├── materials.ts       共享材质（透明不写深度）
│   │   ├── featureArrays.ts   TypedArray 并行数组 + 视锥剔除/分桶
│   │   └── SceneEngine.ts     渲染主类：实例填充/拾取/框选/测距/飞行/圈退
│   ├── stores/session.ts      角色会话
│   └── utils/                 PRNG、格式化
├── components/                图层面板/工具/选择/流程/弹窗
└── routes/                    项目列表页 + 三维工作台
```

## 关键设计

- **确定性数据**：`mulberry32(seed)` 保证同一项目每次打开要素完全一致，localStorage 只存元数据，
  避免上万对象的存储配额问题。
- **帧循环零分配**：剔除与矩阵构建复用 `Matrix4/Quaternion/Vector3` 临时对象，桶索引数组预分配。
- **仅相机移动时重算**：相机静止时跳过重剔除与实例填充，静止场景帧开销只有 render。
- **透明排序**：所有半透明件 `depthWrite=false`，按桶内平均相机距离排序后递增 `renderOrder`，
  网衣/警戒区壁面/航道平面互不串色。
- **状态机**：editing → submitted →（returned ⇄ submitted，≤3 次）→ approved → delivered，
  非法迁移在 store 层直接拒绝。

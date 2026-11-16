# 喀斯特溶洞设计工作台 · Karst Cave Studio

给地质公园使用的**溶洞步道与钟乳石景观过程式生成工具**。由洞道走向、断面尺寸、滴水密度等
参数，确定性地生成洞体网格与钟乳石群，并在同一三维场景内完成步道布线、单株钟乳石编辑、
剖切检查、版本提交、审核批注与两版并排对比。

技术栈：**SolidJS + WebGPU + TypeScript + Vite**，纯前端、本地 IndexedDB 持久化、无需后端。

## 快速开始

```bash
npm install
npm run dev        # 开发服务器（默认 http://localhost:5173）
npm test           # 单元测试（确定性 / 净空 / override / 守门）
npm run build      # 类型检查 + 生产构建
npm run preview    # 预览生产构建
```

> 运行需要支持 WebGPU 的浏览器（Chrome / Edge 113+，桌面端物理显卡）。
> 不支持时显示引导页，不会进入应用。

## 核心功能与实现位置

| 需求 | 实现 |
| --- | --- |
| 确定性生成（同 seed+参数结果字节级一致） | `src/core/rng.ts`（mulberry32 + 分域子流）、`tests/determinism.test.ts` |
| 洞体扫掠网格（噪声洞壁、洞底压平） | `src/core/spline.ts`（平行传输标架）、`src/core/tunnel.ts` |
| 钟乳石三档分级 + 2.2m 净空避让 + 间距哈希 | `src/core/speleothem.ts` |
| 步道自动布线 + 手动改点 + override 保留 | `src/core/trail.ts`、`src/state/store.ts` |
| 单株点选 / 替换 / 删除（编辑隔离） | `src/renderer/picking.ts`、`src/components/SpeleoInspector.tsx` |
| 四层开关（洞体/景观/步道/灯光） | `src/components/LayerPanel.tsx`、渲染层按 layer 跳过 draw |
| 剖切视图（3D clipping + 2D 断面） | WGSL `applyClip`、`src/components/SectionView.tsx` |
| 版本快照 + 审核批注 + 回复状态机 | `src/persistence/`、`src/components/VersionPanel.tsx`、`AnnotationPanel.tsx` |
| 两版并排对比（双视口 + 联动相机） | `CaveRenderer.renderSplit`、`src/components/CompareOverlay.tsx` |
| 面数 / 生成耗时 HUD | `src/components/Hud.tsx`（数据来自 `GenResult.stats`） |
| 俯视平面图编辑走向 | `src/components/PlanMap.tsx` |

## 确定性设计（最高优先级不变量）

1. 生成是纯函数 `(seed, params, overrides) → GenResult`，核心层 `src/core` 禁用
   `Math.random` / `Date` / `crypto`（由 `tests/determinism-guard.test.ts` 静态守门）。
2. **分域子流**：中心线/洞壁/布点/单体形态/灯光各有独立 domain，改一个参数不扰动无关阶段。
3. **稳定 id 取随机**：钟乳石候选格用 `hash(stationIdx, slotIdx)` 取流而非数组下标，
   删除/替换单株不会改变其它个体；替换只改该株 `shapeSeed`，布点/档位/尺寸保持不变。
4. `performance.now()` 仅写入 `stats.elapsedMs`，不参与任何几何决策。

## 数据与持久化

- IndexedDB 库 `karst-cave-db`，含 `projects / versions / annotations / meta` 四个 store。
- **几何不入库**：版本快照只存 `seed + params + overrides + stats`，需要时按快照确定性重算。
- 批注锚点存归一化里程 `s` + 站局部偏移，重生成后按新标架重投影，并保留世界坐标快照兜底。
- 工具栏支持整库 JSON 导出 / 导入备份（`src/persistence/backup.ts`）。
- 所有持久化写入经 `toPlain()` 剥离 Solid 响应式代理，避免 IndexedDB 结构化克隆异常。

## 目录结构

```
src/
  core/        纯函数生成层（不依赖 DOM/WebGPU，可独立单测）
  renderer/    WebGPU 设备、管线、WGSL、实例化、拾取、双视口
  state/       Solid store 与全部 actions
  persistence/ IndexedDB 仓库接口（可替换为 HTTP 后端）
  components/  Solid UI 组件
  types.ts     共享类型
tests/         vitest 确定性与不变量测试
```

## 已知边界

- 无 WebGL 后备渲染器（按需求 WebGPU 独占）；虚拟机/远程桌面常无可用适配器。
- 点光源 uniform 上限 8 盏，超出按当前数量截取（洞道场景足够）。
- 审核协作是单客户端角色切换模拟；数据访问已收敛在 repository 接口，便于将来接真实后端。

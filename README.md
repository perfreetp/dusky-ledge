# 智慧工厂非标设备外形轮廓矢量编辑台

面向「新设备占地轮廓图提资给厂房」场景的矢量编辑工作台。SolidJS + Canvas2D + OffscreenCanvas Worker 实现，世界坐标统一为**毫米（mm）、y 轴向上**。

## 启动

```bash
npm install
npm run dev        # 开发服务器（默认 http://localhost:5173）
npm run build      # 生产构建（Worker 独立分包）
npm run test:geo   # 31 项几何/布尔/SVG/对齐/吸附/对比单元测试
npx tsc --noEmit   # 严格类型检查
```

## 四个界面

| 界面 | 功能 |
|------|------|
| **轮廓编辑** | 绘图、节点编辑、布尔、吸附、对齐分布、图层、度量、SVG 导出、提交版本 |
| **批注审核** | 载入版本，审核人在画布打点批注；制作方逐条回复并流转 待处理→已回复→已闭环 |
| **版本历史** | 按项目号/设备编号/设备名/版本号模糊检索，同设备分组，载入编辑/导出 SVG/对比/删除 |
| **版本对比** | 新旧轮廓半透明叠加，差异段红色虚线高亮，量化面积/周长/节点/差异长度变化 |

## 需求实现对照

| 需求 | 实现位置 |
|------|----------|
| 矩形/圆/圆弧/多边形/贝塞尔 | `lib/geometry.ts`（rect/circle/arcFromThreePoints/polygon/bezierContour）、`components/EditorCanvas.tsx` |
| 选中拖控制点改形（含贝塞尔手柄） | `EditorCanvas` 指针交互 + `store/app.ts` dragNode/dragControl |
| 路径并/交/差，结果保留可编辑节点 | `lib/boolean.ts`（边对裁剪，输出全 line 段、每顶点可编辑） |
| 布尔放 OffscreenCanvas、画布不卡 | `workers/boolean.worker.ts`（独立线程 + OffscreenCanvas 栅格自检指纹）、`lib/booleanClient.ts`（带主线程回退） |
| 节点重合自动去重 | `lib/boolean.ts#dedupeLoop`、`store/app.ts#dedupeShapeNodes`（仅真合并时入栈） |
| 网格/端点/等距参考线吸附 | `lib/snap.ts`（端点优先、等距参考、网格兜底，带参考线可视化） |
| 多选左右上下对齐、等间距分布 | `lib/arrange.ts` + 工具栏 8 个按钮 |
| 图层锁定/隐藏/重命名/增删 | `store/app.ts` 图层操作 + `LeftSidebar.tsx` |
| 撤销重做 ≥50 步 | `lib/history.ts`，容量 100，Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z |
| 选中轮廓面积与周长 | `lib/geometry.ts#shapeMetrics`（弧长解析、贝塞尔高斯积分），画布 HUD + 右栏 |
| SVG 保留图层名与毫米单位 | `lib/svg.ts`（`width/height mm`、`data-unit="mm"`、`inkscape:label`/`data-layer-name`） |
| 提交生成版本号 | `lib/versionStore.ts#nextVersion`（同设备 v1→v2…），localStorage 持久化 |
| 审核打点 + 逐条回复改状态 | `pages/ReviewPage.tsx`，状态 open/replied/resolved |
| 版本对比半透明叠加 + 差异高亮 | `lib/diff.ts` + `pages/ComparePage.tsx` |
| 按项目号/设备编号检索 | `versionStore#search` + `pages/VersionsPage.tsx` |

## 几何内核要点

- **圆弧用 DXF bulge 表示**：`bulge = tan(θ/4)`，正 bulge 为顺时针；`arcGeom` 输出数学扫角（CCW 为正），`arcPoint` 沿有向扫角取点。
- **布尔引擎**采用边对裁剪（Vatti 思路）：所有轮廓按容差采样成折线 → 边在交点处互相切开 → 双侧法线探针把每条子边分类为 严格内部/严格外部/共享边界 → 按并/交/差规则选边 → 有向去重 → 极角规则拼环 → 按包含关系定向外环(CCW)/孔洞(CW)。输出全部是 line 段，**交点本身即节点，不是死图**，可继续拖点编辑并再次参与布尔（`booleanOrigin` 记录来源）。
- **度量**：面积用鞋带公式（支持孔洞带符号求和），周长对弧用 `|sweep|·r`、对三次贝塞尔用 5 点高斯–勒让德积分。

## 验证

- `npm run test:geo`：31 项 Node 单元测试，覆盖圆面积/周长精度、并交差（含孔洞、相切、分离、包含、多形状折叠、圆参与）、三点定弧、贝塞尔、SVG 单位/图层、对齐分布、吸附、版本 diff。
- `tests/e2e-cdp.mjs` / `e2e-canvas.mjs`：基于 Chrome DevTools Protocol 的真实浏览器端到端校验，已确认 Worker `threaded:true`、布尔面积 150 且节点可编辑、版本存取检索、撤销栈 100 步、Canvas 非空渲染、diff 检出，无运行时异常。

## 目录结构

```
src/
  types.ts              数据模型（世界坐标 mm）
  App.tsx               四界面路由 + 全局快捷键/Toast
  store/app.ts          Solid store：文档/选择/图层/撤销/布尔/对齐
  lib/
    geometry.ts         数学内核：弧/贝塞尔/采样/度量/凸包
    boolean.ts          布尔运算（边对裁剪 + 节点去重 + 孔洞定向）
    booleanClient.ts    Worker 封装与主线程回退
    snap.ts             网格/端点/等距吸附
    arrange.ts          对齐与等间距分布
    renderer.ts         Canvas2D 渲染 + 命中测试
    view.ts             平移缩放/世界-屏幕坐标
    svg.ts              毫米单位 SVG 导出
    diff.ts             版本差异段计算
    history.ts          撤销重做栈（100 步）
    versionStore.ts     版本持久化与检索
  workers/boolean.worker.ts  OffscreenCanvas Worker
  components/           画布、工具栏、左右侧栏
  pages/                四个界面
```

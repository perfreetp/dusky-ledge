# 铝艺庭院门 · 镂空花板设计工作台

面向铝艺庭院门厂的镂空花板设计与三维预演 Web 工作台。SolidJS + three.js + TypeScript,纯前端,订单数据存于浏览器 localStorage。

## 运行

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 产物在 dist/
npm test           # 几何与撤销重做逻辑测试
npm run typecheck
```

## 功能与页面

### 1. 花型编辑
- 在三维场景的立面基准面(z=0)上左键单击放置顶点,点击起点或回车闭合轮廓,Esc 取消,Backspace 删除上一点
- 吸附:10mm 网格(间距可在 2–10mm 间调节)、已有轮廓的端点、相邻边投影、边中线(中点),优先级 端点 > 中线 > 边 > 网格,吸附点有彩色指示环
- 多轮廓按列表顺序做 并集 / 差集 / 交集 布尔运算(polygon-clipping),实时得到最终花型;首个轮廓为基底
- 未闭合或自交的轮廓当场标红,右侧面板指出断在哪一段(如"第 1 段与第 3 段相交"),自交边以红色虚线强调;无效轮廓不参与布尔
- 花型挤出为实体,厚度 2–8mm 可调;正午日光 / 射灯两套光源,背墙与地台承接镂空投影,可右键拖动环绕查看
- 饰面:哑光黑 / 香槟金 / 氟碳灰
- 撤销 / 重做连续 20 步(Ctrl+Z / Ctrl+Y 或 Ctrl+Shift+Z)

### 2. 装配预览
- 按订单洞口尺寸生成门框(两根立柱 + 上/中/下横档)
- 拖动花板时与立柱内侧面、横档中线自动对齐(25mm 容差)并显示青色参考线
- 订单审核通过后可导出当前视角的装配效果图 PNG

### 3. 订单交付
- **客户**:选门型(单开/双开/子母/移门)、录入洞口宽×高与交付截止时间,提交订单
- **制作员**:按订单新建/编辑花板(跳转花型编辑页,保存回订单),提交审核;可看到退回原因、返工次数与截止时间
- **主管**:审核队列中通过或退回;退回须填写原因与返工截止时间,返工次数自动 +1;通过后按每块花板导出 SVG 切割路径(单位 mm,Y 轴翻转为左上原点),并到装配预览导出效果图

## 结构

```
src/
  types.ts              共享类型(单位统一为 mm)
  geometry/             snap 吸附 / validate 闭合与自交校验 / boolean 布尔与Shape / svg 切割路径导出
  three/                editorScene 编辑场景 / frameScene 装配场景 / lights 两套光源 / materials 三种饰面
  store/                appStore 订单与审核流(localStorage 持久化)/ editorStore 编辑器状态+20步撤销重做 / nav 页签
  pages/                PatternEditor / AssemblyPreview / OrderDelivery
test/                   几何与状态逻辑测试(esbuild 打包后 node 运行)
```

# 开发用端到端脚本

需要本机安装 Chrome；路径在 `harness.mjs` 的 `CHROME` 常量里。

```bash
node tools/smoke.mjs      # 启动 + WebGL2 初始化检查，输出截图
node tools/interact.mjs   # 放置、镜像、撤销、拖拽、单层显示、框选
node tools/features.mjs   # 图层可见性 / 跨层平移 / 整片替换 / 隐藏 / 撤销重做（含断言）
node tools/e2e.mjs        # 建模型 → 提交 → 教师复核 → 看板
node tools/flaws.mjs      # 缺层 / 不对称 / 超预算的评分与 OBJ 内容
node tools/taskform.mjs   # 教师出题表单
node tools/sizes.mjs      # 窄屏布局
node tools/dragpaint.mjs  # 真实鼠标拖拽绘制与单步撤销
node tools/mirror.mjs     # 镜像编辑并截图
node tools/perf3.mjs      # 较大网格的增量网格化耗时
```

截图输出到本目录，已在 `.gitignore` 中忽略。

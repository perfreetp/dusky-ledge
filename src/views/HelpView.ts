import { defineComponent, h } from 'vue';
import Icon from '@/components/Icon';

const SECTIONS = [
  {
    title: '快速上手',
    items: [
      { k: '新建方案', v: '「方案管理」→ 新建，可从空白图纸或内置示例车间开始。示例含通道、禁停区、工位框、危险区，适合演示与培训。' },
      { k: '上传底图', v: '编辑器工具栏「底图」上传厂房平面图 PNG/JPG。底图仅作参考，不计入标线图层；用图纸宽高与网格对齐实际尺寸。' },
      { k: '绘制通道', v: '选「主通道线」，单击起点 → 逐点单击 → 双击或 Enter 结束。按住 Shift 约束 15° 角，端点自动吸附到已有端点/中点/网格。' },
      { k: '绘制区域', v: '选「禁停区/工位框/物料区/危险区」：拖拽出矩形；按住 Alt 改为逐点多边形，双击闭合。' },
    ],
  },
  {
    title: '路径布尔与流水线',
    items: [
      { k: '并集 / 交集 / 异或', v: '选中两个以上对象（线会自动展开为线宽带），工具栏「并集」等生成新区域。轮廓由 Clipper 求交，结果必定闭合且去除自交。' },
      { k: '差集', v: '第一个选中的对象为主体，其余作为裁剪；可裁出孔洞（多环结果，even-odd 填充）。' },
      { k: '合并流水线 Ctrl+J', v: '把相交/相接的中心线合并为连续折线：在 T 型交叉处自动断点并沿最直方向续接，拐角处不折返。用于把一段段画的通道接成一条物流主线。' },
      { k: '原位合并 Ctrl+G', v: '把多个重叠区域合并为一个，保留第一个对象的样式，不产生多余图层。' },
    ],
  },
  {
    title: '精确编辑',
    items: [
      { k: '顶点编辑', v: '选中对象后拖动方形顶点；双击线段插入顶点；Delete 删除选中顶点；方向键微移（Shift ×10）。' },
      { k: '多选对齐', v: '框选或 Shift 加选 → 工具栏六个对齐按钮；三个以上对象可水平/垂直等距分布（按包围盒空隙均分）。' },
      { k: '撤销 / 重做', v: 'Ctrl+Z / Ctrl+Shift+Z（或 Ctrl+Y），历史栈保留 200 步；拖动、连续改数值会合并为一步。' },
      { k: '网格与吸附', v: '右侧「图纸与网格」可分别开关端点、中点、线段、网格吸附；吸附命中时画布上会出现粉色标记并显示类型。' },
    ],
  },
  {
    title: '规范填充与导出',
    items: [
      { k: '斜纹填充', v: '区域对象可设单向斜纹/交叉斜纹/网格/点阵，间距、角度、纹宽、双色交替（黄黑警示）均可调。填充以 GPU 实例化绘制，几万条线一次 draw call。' },
      { k: '导出 SVG', v: '「导出」→ SVG。1 个绘图单位 = 1 mm，含比例尺与全部斜纹线几何（用 clipPath 裁切），施工方可直接 1:1 出图。' },
      { k: '版本', v: '「保存并发布版本」生成不可变快照；版本库可勾选两个版本比对新增/删除/修改，或恢复旧版本。' },
      { k: '工程量', v: '导出 CSV 便于核算油漆用量与施工长度。' },
    ],
  },
  {
    title: '培训考核流程',
    items: [
      { k: '老师出题', v: '「培训考核」→ 新建任务：内置示例底图 + 参考答案，或选取已有方案作为答案。可设置各类型线宽、数量、位置容差与评分权重。' },
      { k: '学员练习', v: '任务发布后，学员在练习页填写姓名开始绘制；支持本机暂存。提交后服务器用参考答案自动比对。' },
      { k: '自动评分', v: '覆盖度（按类型的绘制区域 IoU）、线宽偏差（对数容差）、闭合度三类加权，缺项/多余/位置偏差计为错题。' },
      { k: '老师复核', v: '成绩页可逐条调整扣分并写评语，填写最终成绩。学员端只看得到自动分与复核结果，看不到参考答案。' },
      { k: '汇总', v: '「成绩汇总」给出平均分、及格率、分数分布与高频错题 Top 10，可导出 CSV。' },
    ],
  },
  {
    title: '快捷键',
    items: [
      { k: '工具', v: 'V 选择 · H 平移 · C 主通道 · W 人行 · F 消防 · N 禁停 · S 工位 · M 物料 · D 危险 · R 矩形 · P 多边形 · T 测量' },
      { k: '编辑', v: 'Ctrl+Z 撤销 · Ctrl+Shift+Z 重做 · Ctrl+A 全选 · Ctrl+D 复制 · Delete 删除 · Esc 取消' },
      { k: '视图', v: '空格 + 拖拽平移 · 滚轮以光标为中心缩放 · 双击图层列表项缩放到对象' },
    ],
  },
];

export default defineComponent({
  name: 'HelpView',
  setup() {
    return () =>
      h('div', { class: 'page' }, [
        h('div', { class: 'page-inner' }, [
          h('h1', null, '使用说明'),
          h('div', { class: 'sub' }, '面向工厂 EHS 与车间主任的标线绘制工具：路径布尔、吸附、多选对齐、规范斜纹、版本归档、SVG 交付与老带新考核。'),
          h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start' },
            SECTIONS.map((sec) =>
              h('div', { class: 'card' }, [
                h('h3', { style: 'display:flex;align-items:center;gap:7px' }, [h(Icon, { name: 'info', size: 14 }), sec.title]),
                h('div', { style: 'display:flex;flex-direction:column;gap:11px' },
                  sec.items.map((it) =>
                    h('div', { key: it.k }, [
                      h('div', { style: 'font-size:12.5px;font-weight:600;margin-bottom:2px' }, it.k),
                      h('div', { class: 'hint', style: 'line-height:1.65' }, it.v),
                    ])
                  )
                ),
              ])
            )
          ),
          h('div', { class: 'card', style: 'margin-top:14px' }, [
            h('h3', null, '技术说明'),
            h('div', { class: 'hint', style: 'line-height:1.8' }, [
              h('div', null, '· 几何：Vue 3 + TypeScript，布尔运算基于 Clipper（整数 0.01mm 精度），三角化使用 earcut。'),
              h('div', null, '· 渲染：WebGPU 实例化绘制，填充/描边/斜纹分别合批；无 WebGPU 时自动回退 Canvas2D。'),
              h('div', null, '· 数据：Node.js + SQLite（方案、版本、任务、提交均为记录），底图以 BLOB 存储。'),
              h('div', null, '· 单位：内部一律毫米；导出 SVG 亦为 1 单位 = 1mm，便于 1:1 打印与施工放线。'),
            ]),
          ]),
        ]),
      ]);
  },
});

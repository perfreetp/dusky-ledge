// 顶部工具栏：导航、工具切换、布尔、撤销重做、吸附、导出
import { Show } from 'solid-js'
import {
  state, setTool, undo, redo, canUndo, canRedo, runBoolean,
  toggleSnap, toggleGrid, removeSelected, alignSelected, distributeSelected,
  historyLabel,
} from '../store/app.ts'
import { downloadSVG } from '../lib/svg.ts'
import { booleanClient } from '../lib/booleanClient.ts'
import type { ToolId } from '../types.ts'

const TOOLS: { id: ToolId; label: string; icon: string; hint: string }[] = [
  { id: 'select', label: '选择', icon: '➤', hint: 'V 选择/框选/拖节点' },
  { id: 'pan', label: '平移', icon: '✥', hint: '抓手平移视图' },
  { id: 'rect', label: '矩形', icon: '▭', hint: '拖拽画矩形' },
  { id: 'circle', label: '圆', icon: '◯', hint: '圆心+半径' },
  { id: 'arc', label: '圆弧', icon: '◠', hint: '逐点采集，双击结束' },
  { id: 'polygon', label: '多边形', icon: '⬡', hint: '逐顶点，双击闭合' },
  { id: 'bezier', label: '贝塞尔', icon: '∿', hint: '每4点一条三次贝塞尔' },
]

export interface TopbarProps {
  page: string
  onNav: (p: string) => void
  onSubmit: () => void
  onToast: (msg: string) => void
}

export default function Topbar(props: TopbarProps) {
  const pages = [
    { id: 'editor', label: '轮廓编辑' },
    { id: 'review', label: '批注审核' },
    { id: 'versions', label: '版本历史' },
    { id: 'compare', label: '版本对比' },
  ]

  async function doBoolean(op: 'union' | 'intersect' | 'subtract') {
    if (state.selection.length < 2) {
      props.onToast('请先选中至少两个轮廓（按住 Shift 多选）')
      return
    }
    const r = await runBoolean(op)
    if (r) {
      props.onToast(
        `${op === 'union' ? '并集' : op === 'intersect' ? '交集' : '差集'}完成：${r.ms.toFixed(1)}ms` +
        `${r.threaded ? `（OffscreenCanvas Worker 线程，指纹 ${r.fingerprint}）` : '（主线程回退）'}，结果保留可编辑节点`,
      )
    }
  }

  return (
    <div class="topbar">
      <div class="brand">智慧工厂轮廓编辑台<small>非标设备占地轮廓 · mm</small></div>
      <div class="nav">
        {pages.map(p => (
          <button class={props.page === p.id ? 'active' : ''} onClick={() => props.onNav(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      <Show when={props.page === 'editor'}>
        <div class="row" style={{ margin: 0 }}>
          {TOOLS.map(t => (
            <button
              class={`icon ${state.tool === t.id ? 'active' : ''}`}
              title={t.hint}
              onClick={() => setTool(t.id)}
            >
              <span style={{ 'margin-right': '4px' }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
        <div class="row" style={{ margin: 0 }}>
          <button title="并集" onClick={() => doBoolean('union')}>∪ 并集</button>
          <button title="交集" onClick={() => doBoolean('intersect')}>∩ 交集</button>
          <button title="差集（首个为主体）" onClick={() => doBoolean('subtract')}>− 差集</button>
        </div>
        <div class="row" style={{ margin: 0 }}>
          <button title="左对齐" onClick={() => alignSelected('left')}>⇤</button>
          <button title="水平居中" onClick={() => alignSelected('hcenter')}>↔</button>
          <button title="右对齐" onClick={() => alignSelected('right')}>⇥</button>
          <button title="顶对齐" onClick={() => alignSelected('top')}>⤒</button>
          <button title="垂直居中" onClick={() => alignSelected('vcenter')}>↕</button>
          <button title="底对齐" onClick={() => alignSelected('bottom')}>⤓</button>
          <button title="水平等间距" onClick={() => distributeSelected('hgap')}>⇿</button>
          <button title="垂直等间距" onClick={() => distributeSelected('vgap')}>⥯</button>
        </div>
        <div class="row" style={{ margin: 0 }}>
          <button title="撤销 (Ctrl+Z)" disabled={!canUndo()} onClick={undo}>↶</button>
          <button title="重做 (Ctrl+Y)" disabled={!canRedo()} onClick={redo}>↷</button>
          <button class={state.snapEnabled ? 'active' : ''} title="网格/端点/等距吸附" onClick={toggleSnap}>吸附</button>
          <button class={state.showGrid ? 'active' : ''} title="网格显示" onClick={toggleGrid}>网格</button>
          <button class="danger" disabled={!state.selection.length} onClick={removeSelected}>删除</button>
        </div>
      </Show>
      <div class="spacer" />
      <Show when={props.page === 'editor'}>
        <button onClick={() => downloadSVG(state.doc,
          `${state.doc.equipmentNo}_轮廓.svg`)} title="导出 SVG（保留图层名与毫米单位）">导出 SVG</button>
        <button class="primary" onClick={props.onSubmit}>提交版本</button>
      </Show>
      <Show when={booleanClient.threaded === false}>
        <span class="tag resolved" title="当前环境不支持 Worker，布尔在主线程计算">Worker 不可用</span>
      </Show>
      <Show when={props.page === 'editor'}>
        <span class="muted mono" title="当前历史栈顶操作">{historyLabel()}</span>
      </Show>
    </div>
  )
}

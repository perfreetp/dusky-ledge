// 右侧栏：轮廓清单、选中度量、图层归属、布尔来源
import { For, Show, createMemo } from 'solid-js'
import {
  state, selectOnly, renameShape, moveShapeToLayer, metricsOf,
} from '../store/app.ts'
import { fmtArea, fmtPerim, fmtMm } from '../lib/utils.ts'

export default function RightSidebar() {
  const selected = createMemo(() =>
    state.doc.shapes.filter(s => state.selection.includes(s.id)))

  return (
    <aside class="sidebar right">
      <div class="panel">
        <h3>轮廓清单（{state.doc.shapes.length}）</h3>
        <Show when={state.doc.shapes.length === 0}>
          <div class="hint">画布为空。从顶部选择矩形/圆/多边形等工具开始绘制。</div>
        </Show>
        <For each={state.doc.shapes}>
          {shape => {
            const layer = () => state.doc.layers.find(l => l.id === shape.layerId)
            const m = metricsOf(shape.id)
            return (
              <div
                class={`shape-item ${state.selection.includes(shape.id) ? 'selected' : ''}`}
                onClick={() => selectOnly(shape.id)}
              >
                <div class="shape-head">
                  <span class="swatch" style={{ background: layer()?.color }} />
                  <input
                    class="name"
                    value={shape.name}
                    style={{ border: 'none', background: 'transparent', padding: '2px', width: '100%' }}
                    onClick={e => e.stopPropagation()}
                    onInput={e => renameShape(shape.id, e.currentTarget.value)}
                  />
                  <Show when={layer()?.locked}><span title="图层锁定">🔒</span></Show>
                  <Show when={layer()?.visible === false}><span title="图层隐藏">🚫</span></Show>
                </div>
                <div class="hint mono" style={{ 'margin-top': '3px' }}>
                  {shape.contours.length} 子轮廓 · {shape.contours.reduce((n, c) => n + c.points.length, 0)} 节点
                </div>
                <Show when={m}>
                  <div class="hint mono">
                    面积 {fmtArea(m!.area)} · 周长 {fmtPerim(m!.perimeter)}
                  </div>
                </Show>
                <Show when={shape.booleanOrigin}>
                  <div class="hint" style={{ color: 'var(--accent)' }}>
                    布尔来源：{shape.booleanOrigin!.op} · {shape.booleanOrigin!.sources.length} 源
                  </div>
                </Show>
                <select
                  class="mini"
                  style={{ width: '100%', 'margin-top': '4px' }}
                  value={shape.layerId}
                  onClick={e => e.stopPropagation()}
                  onChange={e => moveShapeToLayer(shape.id, e.currentTarget.value)}
                >
                  <For each={state.doc.layers}>
                    {l => <option value={l.id}>{l.name}</option>}
                  </For>
                </select>
              </div>
            )
          }}
        </For>
      </div>

      <Show when={selected().length > 0}>
        <div class="panel">
          <h3>选中度量（{selected().length}）</h3>
          <For each={selected()}>
            {s => {
              const m = metricsOf(s.id)!
              return (
                <div style={{ margin: '6px 0' }}>
                  <div style={{ 'font-weight': 600 }}>{s.name}</div>
                  <table>
                    <tbody>
                      <tr><td class="muted">面积</td><td class="mono">{fmtArea(m.area)}</td></tr>
                      <tr><td class="muted">周长</td><td class="mono">{fmtPerim(m.perimeter)}</td></tr>
                      <tr><td class="muted">宽 × 高</td><td class="mono">{fmtMm(m.bbox.maxX - m.bbox.minX)} × {fmtMm(m.bbox.maxY - m.bbox.minY)} mm</td></tr>
                      <tr><td class="muted">原点</td><td class="mono">({fmtMm(m.bbox.minX)}, {fmtMm(m.bbox.minY)})</td></tr>
                    </tbody>
                  </table>
                </div>
              )
            }}
          </For>
        </div>
      </Show>
    </aside>
  )
}

// 页面四：版本对比。新旧轮廓半透明叠加，差异段红色高亮
import { createMemo, createSignal, For, onMount, Show } from 'solid-js'
import { versionStore } from '../lib/versionStore.ts'
import { diffDocs } from '../lib/diff.ts'
import { createView } from '../lib/view.ts'
import { renderCanvas } from '../lib/renderer.ts'
import type { Doc, VersionRecord } from '../types.ts'
import { fmtMm, fmtPerim } from '../lib/utils.ts'
import { shapeMetrics } from '../lib/geometry.ts'

export interface ComparePageProps {
  initialOldId?: string
  initialNewId?: string
}

function MiniCanvas(props: { doc: Doc; overlayDoc?: Doc; alpha?: number; diff?: any }) {
  let ref!: HTMLCanvasElement
  const viewApi = createView({ scale: 1.5, ox: 160, oy: 260 })
  const [ready, setReady] = createSignal(false)

  onMount(() => {
    const parent = ref.parentElement!
    const draw = () => {
      const w = parent.clientWidth, h = parent.clientHeight
      renderCanvas(ref, viewApi, {
        doc: props.doc,
        selection: new Set(),
        activeNode: null,
        showGrid: true,
        guides: [],
        annotations: [],
        overlay: props.overlayDoc ? { doc: props.overlayDoc, alpha: props.alpha ?? 0.45, diffPaths: props.diff ? [props.diff.removed, props.diff.added] : undefined } : undefined,
        width: w, height: h,
      })
    }
    const ro = new ResizeObserver(draw)
    ro.observe(parent)
    requestAnimationFrame(() => {
      // 自适应包围盒
      if (props.doc.shapes.length) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const s of props.doc.shapes) {
          const b = shapeMetrics(s)
          void b
        }
      }
      draw()
      setReady(true)
    })
  })

  return <canvas ref={ref} />
}

export default function ComparePage(p: ComparePageProps) {
  const versions = createMemo(() => versionStore.list())
  const [oldId, setOldId] = createSignal(p.initialOldId ?? '')
  const [newId, setNewId] = createSignal(p.initialNewId ?? '')
  const oldRec = createMemo(() => (oldId() ? versionStore.get(oldId()) : undefined))
  const newRec = createMemo(() => (newId() ? versionStore.get(newId()) : undefined))

  const diff = createMemo(() => {
    if (!oldRec() || !newRec()) return null
    return diffDocs(oldRec()!.doc, newRec()!.doc)
  })

  const metricDelta = createMemo(() => {
    if (!oldRec() || !newRec()) return null
    const sum = (doc: Doc) => {
      let area = 0, perim = 0, nodes = 0
      for (const s of doc.shapes) {
        const m = shapeMetrics(s)
        area += m.area; perim += m.perimeter
        nodes += s.contours.reduce((n, c) => n + c.points.length, 0)
      }
      return { area, perim, nodes, shapes: doc.shapes.length }
    }
    const a = sum(oldRec()!.doc), b = sum(newRec()!.doc)
    return { a, b }
  })

  return (
    <div class="page">
      <div class="page-inner">
        <div class="card">
          <h3 style={{ margin: '0 0 10px' }}>版本对比</h3>
          <div class="compare-grid">
            <div>
              <label>旧版本（半透明灰）</label>
              <select value={oldId()} onChange={e => setOldId(e.currentTarget.value)} style={{ width: '100%' }}>
                <option value="">— 选择旧版本 —</option>
                <For each={versions()}>{v => <option value={v.id}>{v.version} · {v.equipmentNo} · {new Date(v.createdAt).toLocaleDateString('zh-CN')}</option>}</For>
              </select>
            </div>
            <div>
              <label>新版本（彩色实线）</label>
              <select value={newId()} onChange={e => setNewId(e.currentTarget.value)} style={{ width: '100%' }}>
                <option value="">— 选择新版本 —</option>
                <For each={versions()}>{v => <option value={v.id}>{v.version} · {v.equipmentNo} · {new Date(v.createdAt).toLocaleDateString('zh-CN')}</option>}</For>
              </select>
            </div>
          </div>
          <Show when={!oldRec() || !newRec()}>
            <div class="hint" style={{ 'margin-top': '10px' }}>请在两侧各选一个版本。建议对比同一设备的相邻版本。</div>
          </Show>
        </div>

        <Show when={oldRec() && newRec() && diff() && metricDelta()}>
          <div class="card">
            <div class="legend">
              <span style={{ color: '#94a3b8' }}>旧轮廓（半透明叠加）</span>
              <span style={{ color: '#38bdf8' }}>新轮廓</span>
              <span style={{ color: '#ef4444' }}>差异段（红色虚线高亮）</span>
            </div>
            <div class="compare-grid">
              <div>
                <div class="hint" style={{ 'margin-bottom': '4px' }}>旧版 {oldRec()!.version} 单独显示</div>
                <div class="compare-canvas"><MiniCanvas doc={oldRec()!.doc} /></div>
              </div>
              <div>
                <div class="hint" style={{ 'margin-bottom': '4px' }}>新版 {newRec()!.version} + 旧版叠加 + 差异高亮</div>
                <div class="compare-canvas">
                  <MiniCanvas doc={newRec()!.doc} overlayDoc={oldRec()!.doc} alpha={0.4} diff={diff()} />
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <h3 style={{ margin: '0 0 8px' }}>量化变化</h3>
            <table>
              <thead><tr><th>指标</th><th>旧版 {oldRec()!.version}</th><th>新版 {newRec()!.version}</th><th>变化</th></tr></thead>
              <tbody>
                <tr>
                  <td>轮廓数</td>
                  <td class="mono">{metricDelta()!.a.shapes}</td>
                  <td class="mono">{metricDelta()!.b.shapes}</td>
                  <td class="mono">{metricDelta()!.b.shapes - metricDelta()!.a.shapes}</td>
                </tr>
                <tr>
                  <td>可编辑节点数</td>
                  <td class="mono">{metricDelta()!.a.nodes}</td>
                  <td class="mono">{metricDelta()!.b.nodes}</td>
                  <td class="mono">{metricDelta()!.b.nodes - metricDelta()!.a.nodes}</td>
                </tr>
                <tr>
                  <td>总面积</td>
                  <td class="mono">{fmtMm(metricDelta()!.a.area)} mm²</td>
                  <td class="mono">{fmtMm(metricDelta()!.b.area)} mm²</td>
                  <td class="mono">{fmtMm(metricDelta()!.b.area - metricDelta()!.a.area)} mm²</td>
                </tr>
                <tr>
                  <td>总周长</td>
                  <td class="mono">{fmtPerim(metricDelta()!.a.perim)}</td>
                  <td class="mono">{fmtPerim(metricDelta()!.b.perim)}</td>
                  <td class="mono">{fmtMm(metricDelta()!.b.perim - metricDelta()!.a.perim)} mm</td>
                </tr>
                <tr>
                  <td>差异段总长度</td>
                  <td colspan="2" />
                  <td class="mono" style={{ color: 'var(--danger)' }}>{fmtPerim(diff()!.diffLength)}</td>
                </tr>
                <tr>
                  <td>差异段数量</td>
                  <td colspan="2" />
                  <td class="mono">{diff()!.removed.length + diff()!.added.length} 段
                    （移除 {diff()!.removed.length} / 新增 {diff()!.added.length}）</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Show>
      </div>
    </div>
  )
}

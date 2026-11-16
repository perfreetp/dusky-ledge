// 页面三：版本历史检索
import { createMemo, createSignal, For, Show } from 'solid-js'
import { versionStore } from '../lib/versionStore.ts'
import type { VersionRecord } from '../types.ts'
import { downloadSVG } from '../lib/svg.ts'
import { loadDoc } from '../store/app.ts'

export interface VersionsPageProps {
  onCompare: (oldId: string, newId: string) => void
  onEdit: (id: string) => void
  onToast: (msg: string) => void
}

export default function VersionsPage(props: VersionsPageProps) {
  const [keyword, setKeyword] = createSignal('')
  const [tick, setTick] = createSignal(0)
  const results = createMemo(() => {
    void tick()
    return versionStore.search(keyword())
  })

  function remove(id: string) {
    if (!confirm('确认删除该版本记录？此操作不可恢复。')) return
    versionStore.remove(id)
    setTick(t => t + 1)
    props.onToast('版本已删除')
  }

  function exportSvg(rec: VersionRecord) {
    downloadSVG(rec.doc, `${rec.equipmentNo}_${rec.version}.svg`)
    props.onToast(`已导出 ${rec.version} SVG（图层名与 mm 单位已保留）`)
  }

  function loadForEdit(rec: VersionRecord) {
    loadDoc(structuredClone(rec.doc), `载入 ${rec.version}`)
    props.onEdit(rec.id)
  }

  // 同设备分组，便于直接选相邻两版做对比
  const equipmentGroups = createMemo(() => {
    const map = new Map<string, VersionRecord[]>()
    for (const r of results()) {
      const k = `${r.projectNo} / ${r.equipmentNo}`
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(r)
    }
    return [...map.entries()]
  })

  return (
    <div class="page">
      <div class="page-inner">
        <div class="card">
          <h3 style={{ margin: '0 0 10px' }}>历史版本检索</h3>
          <div class="search-bar">
            <input
              placeholder="输入项目号、设备编号、设备名或版本号关键字…"
              value={keyword()}
              onInput={e => setKeyword(e.currentTarget.value)}
            />
            <button onClick={() => setKeyword('')}>清空</button>
          </div>
          <div class="hint">共 {results().length} 条版本记录，按提交时间倒序。localStorage 持久化。</div>
        </div>

        <Show when={results().length === 0}>
          <div class="card muted">没有匹配的版本。</div>
        </Show>

        <For each={equipmentGroups()}>
          {([groupName, recs]) => (
            <div class="card">
              <h3 style={{ margin: '0 0 8px' }}>{groupName} <span class="muted">（{recs[0].equipmentName}，{recs.length} 版）</span></h3>
              <table>
                <thead>
                  <tr>
                    <th>版本</th><th>提交时间</th><th>提交人</th><th>轮廓/节点</th>
                    <th>批注</th><th>说明</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={recs}>
                    {(rec, i) => {
                      const shapeCount = rec.doc.shapes.length
                      const nodeCount = rec.doc.shapes.reduce(
                        (n, s) => n + s.contours.reduce((m, c) => m + c.points.length, 0), 0)
                      const openCount = rec.annotations.filter(a => a.status !== 'resolved').length
                      return (
                        <tr>
                          <td><b class="pill">{rec.version}</b></td>
                          <td class="mono">{new Date(rec.createdAt).toLocaleString('zh-CN')}</td>
                          <td>{rec.submitter}</td>
                          <td class="mono">{shapeCount} / {nodeCount}</td>
                          <td>
                            <span class={openCount ? 'tag open' : 'tag resolved'}>
                              {rec.annotations.length} 条{openCount ? ` · ${openCount} 未闭环` : ' · 全闭环'}
                            </span>
                          </td>
                          <td style={{ 'max-width': '220px', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
                            {rec.note || <span class="muted">—</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', 'gap': '4px' }}>
                              <button class="mini" onClick={() => loadForEdit(rec)}>载入编辑</button>
                              <button class="mini" onClick={() => exportSvg(rec)}>SVG</button>
                              <Show when={i() < recs.length - 1}>
                                <button
                                  class="mini primary"
                                  title="与更新一版对比"
                                  onClick={() => props.onCompare(rec.id, recs[i() + 1].id)}
                                >对比 ↑</button>
                              </Show>
                              <button class="mini danger" onClick={() => remove(rec.id)}>删</button>
                            </div>
                          </td>
                        </tr>
                      )
                    }}
                  </For>
                </tbody>
              </table>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

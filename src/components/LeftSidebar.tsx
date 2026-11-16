// 左侧栏：项目元数据 + 图层管理（锁定/隐藏/重命名/增删）
import { For, Show } from 'solid-js'
import {
  state, addLayer, toggleLayerLock, toggleLayerVisible,
  renameLayer, removeLayer, setMeta,
} from '../store/app.ts'

export default function LeftSidebar() {
  return (
    <aside class="sidebar">
      <div class="panel">
        <h3>项目信息</h3>
        <label>项目号</label>
        <input value={state.doc.projectNo} onInput={e => setMeta('projectNo', e.currentTarget.value)} />
        <label style={{ display: 'block', 'margin-top': '6px' }}>设备编号</label>
        <input value={state.doc.equipmentNo} onInput={e => setMeta('equipmentNo', e.currentTarget.value)} />
        <label style={{ display: 'block', 'margin-top': '6px' }}>设备名称</label>
        <input value={state.doc.equipmentName} onInput={e => setMeta('equipmentName', e.currentTarget.value)} />
        <label style={{ display: 'block', 'margin-top': '6px' }}>网格尺寸 (mm)</label>
        <input
          type="number" min="1" step="10"
          value={state.doc.gridSize}
          onInput={e => setMeta('gridSize', Math.max(1, Number(e.currentTarget.value) || 100))}
        />
      </div>

      <div class="panel">
        <h3>图层（{state.doc.layers.length}）</h3>
        <For each={state.doc.layers}>
          {layer => (
            <div class="layer-item">
              <div class="layer-head">
                <span class="swatch" style={{ background: layer.color }} />
                <input
                  class="name"
                  value={layer.name}
                  style={{ border: 'none', background: 'transparent', padding: '2px', width: '100%' }}
                  onInput={e => renameLayer(layer.id, e.currentTarget.value)}
                />
                <button
                  class="mini icon"
                  title={layer.visible ? '隐藏' : '显示'}
                  onClick={() => toggleLayerVisible(layer.id)}
                >{layer.visible ? '👁' : '🚫'}</button>
                <button
                  class="mini icon"
                  title={layer.locked ? '解锁' : '锁定'}
                  onClick={() => toggleLayerLock(layer.id)}
                >{layer.locked ? '🔒' : '🔓'}</button>
                <button
                  class="mini icon danger"
                  title="删除图层"
                  disabled={state.doc.layers.length <= 1}
                  onClick={() => removeLayer(layer.id)}
                >✕</button>
              </div>
              <div class="hint">
                {state.doc.shapes.filter(s => s.layerId === layer.id).length} 个轮廓 · {layer.color}
              </div>
            </div>
          )}
        </For>
        <button style={{ width: '100%', 'margin-top': '6px' }} onClick={() => addLayer()}>＋ 新建图层</button>
      </div>

      <div class="panel">
        <h3>操作提示</h3>
        <div class="hint">
          <div><span class="kbd">Shift</span> 多选 / 框选加选</div>
          <div><span class="kbd">滚轮</span> 缩放，<span class="kbd">右键/中键</span> 平移</div>
          <div><span class="kbd">Esc</span> 取消，<span class="kbd">Enter</span> 结束采集</div>
          <div><span class="kbd">Ctrl+Z</span> 撤销（可退 100 步）</div>
          <Show when={!state.snapEnabled}>
            <div style={{ color: 'var(--warn)' }}>吸附已关闭</div>
          </Show>
        </div>
      </div>
    </aside>
  )
}

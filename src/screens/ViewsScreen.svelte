<script>
  import { routeStats, panels, holds } from '../store.js'
  import { captureView } from '../lib/scene.js'

  let busy = ''
  async function shot(kind) {
    busy = kind
    try { await captureView(kind) } finally { busy = '' }
  }
</script>

<div class="views">
  <div class="panel">
    <h3>出图(正交投影,自动下载 PNG)</h3>
    <div class="row">
      <button class="primary" disabled={busy || !$panels.length} on:click={() => shot('front')}>
        {busy === 'front' ? '生成中…' : '正视图(墙面展开)'}
      </button>
      <button class="primary" disabled={busy || !$panels.length} on:click={() => shot('top')}>
        {busy === 'top' ? '生成中…' : '俯视图(坠落区)'}
      </button>
    </div>
    <div class="hint">正视图: 沿岩壁法线方向正交拍摄;俯视图: 自墙顶垂直向下。各出一张 1920×1200 PNG。</div>
  </div>

  <div class="panel">
    <h3>线路统计(共 {$holds.length} 个支点 / {$panels.length} 块岩板)</h3>
    <table class="stats">
      <thead>
        <tr><th>线路</th><th>支点数</th><th>螺栓数</th><th>占用岩板</th><th>支点投影面积</th><th>岩板占用比例</th></tr>
      </thead>
      <tbody>
        {#each $routeStats as s}
          <tr>
            <td><span class="dot" style="background:{s.route.color}"></span>{s.route.name}</td>
            <td>{s.count}</td>
            <td>{s.bolts}</td>
            <td>{s.panels} 块</td>
            <td>{s.area.toFixed(3)} m²</td>
            <td>
              <div class="bar"><div class="fill" style="width:{Math.min(s.ratio * 100 * 8, 100)}%;background:{s.route.color}"></div></div>
              {(s.ratio * 100).toFixed(2)}%
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    <div class="hint">岩板占用比例 = 该线路全部支点正面投影面积之和 ÷ 岩板总面积({$panels.reduce((a, p) => a + p.width * p.height, 0).toFixed(2)} m²)。</div>
  </div>
</div>

<style>
  .views { padding: 14px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; height: 100%; }
  .row { display: flex; gap: 10px; margin-bottom: 8px; }
  .hint { font-size: 12px; color: #9aa0a6; }
  .dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
  .bar { display: inline-block; width: 120px; height: 10px; background: #333; border-radius: 5px; overflow: hidden; margin-right: 8px; vertical-align: middle; }
  .fill { height: 100%; }
</style>

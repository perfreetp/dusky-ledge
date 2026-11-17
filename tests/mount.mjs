// 组件级冒烟测试：用 Vite SSR 加载 .vue 并 renderToString，捕获模板/setup 运行时错误
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

// 浏览器 API 垫片（setup 阶段会碰到 window/localStorage/OffscreenCanvas）
globalThis.window = globalThis.window || { addEventListener () {}, removeEventListener () {}, confirm: () => true }
globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem () {}, removeItem () {} }
globalThis.OffscreenCanvas = class { constructor () { } getContext () { return null } }

let pass = 0, fail = 0
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`) } else { fail++; console.error(`  ✗ ${name} ${extra}`) }
}

const vite = await createServer({
  configFile: false,
  plugins: [vue()],
  server: { middlewareMode: true },
  logLevel: 'error'
})

try {
  const stubState = {
    model: { size: 16, voxels: new Map() }, tool: 'add', color: 0, mirror: 'off',
    layerMode: false, activeLayer: 0, selection: new Set(), hover: null,
    yaw: 0.5, tile: 26, version: 0, readonlyKey: 0, requestAdd: () => true, bump: () => {}
  }
  const cases = [
    { path: '/src/App.vue', props: {}, expect: '方块工坊' },
    { path: '/src/components/VoxelEditor.vue', props: {}, expect: '编辑工具' },
    { path: '/src/components/VoxelViewport.vue', props: { state: stubState }, expect: '' },
    { path: '/src/components/LayerView.vue', props: { state: stubState }, expect: '' },
    { path: '/src/components/TaskCenter.vue', props: {}, expect: '考级任务中心' },
    { path: '/src/components/ReviewDesk.vue', props: {}, expect: '教师复核台' },
    { path: '/src/components/GradeDashboard.vue', props: {}, expect: '成绩与常见错法' }
  ]
  for (const c of cases) {
    const mod = await vite.ssrLoadModule(c.path)
    const Comp = mod.default
    const html = await renderToString(createApp({ render: () => h(Comp, c.props) }))
    check(`${c.path.split('/').pop()} 可渲染`, typeof html === 'string' && html.length > 0, `len=${html.length}`)
    if (c.expect) check(`${c.path.split('/').pop()} 含关键文案`, html.includes(c.expect))
  }
} finally {
  await vite.close()
}
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)

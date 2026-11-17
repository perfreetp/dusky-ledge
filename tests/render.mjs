// 渲染器冒烟测试：最小 Canvas 垫片下验证投影/排序/可见面/离屏拾取编解码
import { IsoRenderer } from '../src/lib/iso.js'
import { seedHouse, keyOf } from '../src/lib/voxel.js'

let pass = 0, fail = 0
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`) } else { fail++; console.error(`  ✗ ${name} ${extra}`) }
}

// 记录最后一次填充色的 2D 上下文垫片
function makeCtx () {
  return {
    _last: [0, 0, 0, 255],
    set fillStyle (v) {
      let r = 0, g = 0, b = 0
      const rgb = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(v)
      const hex = /^#([0-9a-f]{6})$/i.exec(v)
      if (rgb) { r = +rgb[1]; g = +rgb[2]; b = +rgb[3] }
      else if (hex) { const n = parseInt(hex[1], 16); r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255 }
      else return
      this._last = [r, g, b, 255]
    },
    get fillStyle () { return `rgb(${this._last[0]},${this._last[1]},${this._last[2]})` },
    getImageData () { return { data: Uint8ClampedArray.from(this._last) } },
    save () {}, restore () {}, scale () {}, translate () {}, clearRect () {}, setTransform () {},
    beginPath () {}, moveTo () {}, lineTo () {}, closePath () {}, fill () {}, stroke () {},
    fillRect () {}, strokeRect () {}, setLineDash () {}
  }
}
const ctx2d = makeCtx()
const canvasStub = { width: 800, height: 600, getContext: () => ctx2d, addEventListener () {}, getBoundingClientRect: () => ({ left: 0, top: 0 }) }
globalThis.OffscreenCanvas = class {
  constructor () { this.width = 1; this.height = 1 }
  getContext () { return ctx2d }
}

const r = new IsoRenderer(canvasStub)
r.resize(800, 600, 1)
r.model = seedHouse(16)

// 1. 渲染不抛错（含地面、体素面、排序全流程）
let threw = null
try { r.render() } catch (e) { threw = e }
check('完整 render() 不抛错', !threw, threw?.message)

// 2. 深度排序升序
const order = r.buildOrder()
let sorted = true
for (let i = 1; i < order.length; i++) if (order[i].depth < order[i - 1].depth) sorted = false
check('画家深度排序升序', sorted)
check('排序覆盖全部体素', order.length === r.model.voxels.size)

// 3. yaw=π/6 时 +x、+y 两面可见
r.yaw = Math.PI / 6
const faces = r.visibleSideFaces()
check('可见侧面为 +x(0)/+y(2)', faces.length === 2 && faces[0] === 0 && faces[1] === 2, JSON.stringify(faces))

// 4. 投影居中：工作区中心点投影到原点
const c = (r.model.size - 1) / 2 + 0.5
const pc = r.project(c, c, c)
check('中心体素投影在原点', Math.abs(pc.sx) < 1e-9 && Math.abs(pc.sy) < 1e-9)

// 5. 光照系数范围
const lf = r.lightFactor([0, 0, 1])
check('顶面光照系数在 0.52~1.0', lf >= 0.52 && lf <= 1.0, String(lf))

// 6. 离屏拾取编码/解码往返：渲染后取最后绘制面，应解出真实存在的体素与合法面号
r.renderPick()
const hit = r.pick(400, 300)
check('拾取结果可解码', hit && r.model.voxels.has(hit.key), JSON.stringify(hit))
check('命中面号合法(0-5)', hit && hit.face >= 0 && hit.face <= 5)
check('命中法线为单位轴向', hit && Math.abs(hit.nx) + Math.abs(hit.ny) + Math.abs(hit.nz) === 1)
// 空白像素（垫片清屏后 _last 未变时仍为最后色，这里直接测 id=0 分支）
ctx2d._last = [0, 0, 0, 0]
check('空像素拾取返回 null', r.pick(0, 0) === null)

// 7. 框选：超大矩形应覆盖当前全部体素
r.render()
const all = r.marquee({ x1: -9999, y1: -9999, x2: 9999, y2: 9999 })
check('全画布框选覆盖全部体素', all.length === r.model.voxels.size)

// 8. 切片模式下拾取只返回当前层
r.activeLayer = 0
r.pickDirty = true // 模拟 UI 中切层后 watcher 标记重绘
r.renderPick()
const hit0 = r.pick(400, 300)
check('切片拾取限定在 z=0 层', hit0 && hit0.z === 0, JSON.stringify(hit0))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)

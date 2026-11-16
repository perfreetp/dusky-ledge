// 无头浏览器验证：渲染 / 落格 / 镜像 / 切片 / 框选 / 复制粘贴 / 导出 / 工序流转
// 用法：先 npm run dev，再 node tools/verify.mjs [baseUrl]
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import os from 'os'

const BASE = process.argv[2] || 'http://127.0.0.1:5173/'
const CHROME =
  process.env.CHROME_PATH ||
  (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : undefined)

const results = []
const errors = []

function check(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail })
  const mark = cond ? 'PASS' : 'FAIL'
  console.log(`  [${mark}] ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--enable-unsafe-webgpu',
    '--use-webgpu-adapter=swiftshader',
    '--enable-features=Vulkan',
    '--disable-gpu-sandbox',
  ],
})

const page = await browser.newPage({ viewport: { width: 1600, height: 960 } })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('404')) errors.push('console: ' + m.text().slice(0, 200))
})

await page.goto(BASE)
await page.waitForTimeout(2800)
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForTimeout(2500)

console.log('\n== WebGPU 渲染 ==')
const gpu = await page.evaluate(() => !!window.__vp?.renderer?.ok)
check('WebGPU 初始化成功', gpu)
const meshInfo = await page.evaluate(() => ({
  tris: window.__vp.renderer.mesh?.triCount,
  idx: window.__vp.renderer.gpuMesh?.indexCount,
}))
check('预设模型已上传到 GPU', meshInfo.tris > 100, `${meshInfo.tris} 面`)

const canvasBox = await page.locator('canvas.gpu').boundingBox()
check('画布尺寸非零', canvasBox.width > 400 && canvasBox.height > 300, `${Math.round(canvasBox.width)}×${Math.round(canvasBox.height)}`)

console.log('\n== 编辑操作 ==')
const baseCount = await page.evaluate(() => window.__vp.es.stats.count)
await page.keyboard.press('b')
await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2)
await page.waitForTimeout(200)
const hover = await page.evaluate(() => window.__vp.es.hoverPlace)
check('指针悬停给出落点', Array.isArray(hover), hover ? hover.join(',') : 'null')
await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2)
await page.waitForTimeout(300)
const afterPaint = await page.evaluate(() => window.__vp.es.stats.count)
check('落格后体素数 +1', afterPaint === baseCount + 1, `${baseCount} → ${afterPaint}`)

await page.keyboard.press('Control+z')
await page.waitForTimeout(400)
const afterUndo = await page.evaluate(() => window.__vp.es.stats.count)
check('撤销恢复体素数', afterUndo === baseCount, `${afterPaint} → ${afterUndo}`)

await page.evaluate(() => {
  const s = window.__vp.store
  s.toggleMirror()
  s.setMirrorAxis('x')
})
const mBefore = await page.evaluate(() => window.__vp.es.stats.count)
await page.mouse.click(canvasBox.x + canvasBox.width / 2 - 70, canvasBox.y + canvasBox.height / 2 + 60)
await page.waitForTimeout(350)
const mAfter = await page.evaluate(() => window.__vp.es.stats.count)
check('镜像开启后一次落两格', mAfter === mBefore + 2, `${mBefore} → ${mAfter}`)
await page.evaluate(() => { const s = window.__vp.store; s.toggleMirror() })

const slice = await page.evaluate(() => {
  const s = window.__vp.store
  s.setSection('x', 7, 'min')
  return window.__vp.renderer.mesh.triCount
})
await page.waitForTimeout(500)
const sliceTris = await page.evaluate(() => window.__vp.renderer.mesh?.triCount)
check('切片减少了可见面数', sliceTris < meshInfo.tris && sliceTris > 0, `${meshInfo.tris} → ${sliceTris}`)
await page.evaluate(() => window.__vp.store.clearSection())
await page.waitForTimeout(300)

console.log('\n== 框选与剪贴板 ==')
await page.evaluate(() => { window.__vp.es.tool = 'select' })
await page.mouse.move(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.4)
await page.mouse.down()
await page.mouse.move(canvasBox.x + canvasBox.width * 0.52, canvasBox.y + canvasBox.height * 0.6, { steps: 6 })
await page.mouse.up()
await page.waitForTimeout(400)
const sel = await page.evaluate(() => window.__vp.es.selection)
check('框选出选区包围盒', !!sel, sel ? `${sel.min}~${sel.max}` : 'none')
await page.keyboard.press('Control+c')
await page.waitForTimeout(400)
const clip = await page.evaluate(() => ({
  n: window.__vp.es.clipboard?.items.length,
  tool: window.__vp.es.tool,
  target: window.__vp.es.clipboardTarget,
}))
check('复制进剪贴板并切到定位模式', clip.n > 0 && clip.tool === 'blit', `${clip.n} 格`)

const collided = await page.evaluate(() => {
  const s = window.__vp.store
  const target = [6, 5, 6]
  s.updateClipboardPreview(target)
  return { hits: window.__vp.es.clipboardCollision, oob: window.__vp.es.clipboardOutOfBounds }
})
check('落点冲突计数', typeof collided.hits === 'number', `压到 ${collided.hits} 格`)

const pasted = await page.evaluate(() => {
  const s = window.__vp.store
  const before = window.__vp.es.stats.count
  s.updateClipboardPreview([0, 9, 0])
  s.pasteClipboard()
  return { before, after: window.__vp.es.stats.count }
})
await page.waitForTimeout(400)
const pastedNow = await page.evaluate(() => window.__vp.es.stats.count)
check('粘贴增加体素', pastedNow > pasted.before, `${pasted.before} → ${pastedNow}`)

console.log('\n== 导出核算 ==')
await page.getByRole('button', { name: '导出 glb' }).click()
await page.waitForTimeout(900)
const report = await page.evaluate(() => {
  const v = window.__vp
  const { exportReport } = v.glbApi
  return exportReport(v.es.model, {})
})
check('体素统计非空', report.voxels > 0, `${report.voxels} 格`)
check('合并后为外观面', report.mergedTri > 0 && report.mergedTri <= report.rawFaceCount * 2, `${report.rawFaceCount} 四边面 → ${report.mergedTri} 三角面`)
const sum = report.triByGroup.reduce((a, b) => a + b, 0)
check('四组面数之和等于总数', sum === report.mergedTri, `${report.triByGroup.join('+')} = ${sum}`)

const glb = await page.evaluate(() => {
  const v = window.__vp
  const { buildGLB } = v.glbApi
  const { glb, triTotal } = buildGLB(v.es.model, {})
  let s = ''
  for (let i = 0; i < glb.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, glb.subarray(i, i + 0x8000))
  }
  return { b64: btoa(s), triTotal }
})
const glbPath = path.join(os.tmpdir(), 'profile-workshop-verify.glb')
fs.writeFileSync(glbPath, Buffer.from(glb.b64, 'base64'))
const buf = fs.readFileSync(glbPath)
const magic = buf.toString('ascii', 0, 4)
const declared = buf.readUInt32LE(8)
const jlen = buf.readUInt32LE(12)
let json = null
try {
  json = JSON.parse(buf.toString('utf8', 20, 20 + jlen).trim())
} catch {
  json = null
}
check('GLB 头部合法', magic === 'glTF' && declared === buf.length, `${magic}, ${buf.length} bytes`)
check('GLB 含四组网格', json?.meshes?.length === 4, json?.nodes?.map((n) => n.name).join(' / '))
const glbSum = json?.meshes?.reduce((a, m) => a + json.accessors[m.primitives[0].indices].count / 3, 0)
check('GLB 三角面数一致', glbSum === glb.triTotal, `${glb.triTotal} tri`)
check(
  '导出面数与核算面板一致（组间相邻面已剔除）',
  glb.triTotal === report.mergedTri,
  `GLB ${glb.triTotal} vs 面板 ${report.mergedTri}`
)

// 20,000 面拦截
const limit = await page.evaluate(() => {
  const v = window.__vp
  v.store.emptyModel(60, 40, 60)
  const m = v.es.model
  for (let z = 0; z < m.sz; z++)
    for (let y = 0; y < m.sy; y++)
      for (let x = 0; x < m.sx; x++) {
        const g = (x + y + z) % 4
        const mat = ((x + 2 * y + z) % 8) - 1
        m.set(x, y, z, g | (((mat + 1) & 15) << 3) | (15 << 7))
      }
  v.es.editor.notify('bulk')
  return true
})
await page.waitForTimeout(500)
await page.getByRole('button', { name: '重新统计' }).click().catch(() => {})
await page.waitForTimeout(700)
const over = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.dialog .dlg-ft .btn')]
  const primary = btns[btns.length - 1]
  return { disabled: primary.disabled, label: primary.textContent.trim() }
})
check('超过 2 万面时禁止导出', over.disabled, over.label)
await page.locator('.dialog .x').click()
await page.waitForTimeout(300)
await page.evaluate(() => window.__vp.store.loadPreset('cnc'))
await page.waitForTimeout(600)

console.log('\n== 工序流转 ==')
await page.getByRole('button', { name: /需求单/ }).click()
await page.waitForTimeout(500)
await page.selectOption('.user-switch select', 'p1')
await page.waitForTimeout(300)
await page.locator('.order .act button', { hasText: '派工' }).first().click()
await page.waitForTimeout(400)
await page.locator('.pp').first().click()
await page.getByRole('button', { name: '确认派工' }).click()
await page.waitForTimeout(500)
let store = await page.evaluate(() => JSON.parse(localStorage.getItem('profile-workshop:workflow:v1')))
const assignedOrder = store.orders.find((o) => o.status === 'doing' && o.assignee)
check('组长派工写入承接人与状态', !!assignedOrder, assignedOrder ? `${assignedOrder.id} → ${assignedOrder.assignee}` : 'none')

await page.selectOption('.user-switch select', assignedOrder.assignee)
await page.waitForTimeout(300)
await page.getByRole('button', { name: '建模台' }).click()
await page.waitForTimeout(1200)
await page.getByRole('button', { name: '提交质检' }).first().click()
await page.waitForTimeout(400)
for (const i of [0, 1, 2]) await page.locator('.chk input').nth(i).check()
await page.getByRole('button', { name: '确认提交' }).click()
await page.waitForTimeout(600)
store = await page.evaluate(() => JSON.parse(localStorage.getItem('profile-workshop:workflow:v1')))
let target = store.orders.find((o) => o.id === assignedOrder.id)
check('提交后进入待质检并带统计', target.status === 'submitted' && target.stats?.voxels > 0, `${target.status}, ${JSON.stringify(target.stats)}`)

await page.selectOption('.user-switch select', 'p6')
await page.waitForTimeout(300)
await page.getByRole('button', { name: /需求单/ }).click()
await page.waitForTimeout(500)
await page.locator('.order .act button', { hasText: '质检' }).first().click()
await page.waitForTimeout(500)
await page.locator('.dlg-bd textarea').fill('剖面没做到中线，按要求返工。')
await page.getByRole('button', { name: /不合格/ }).click()
await page.waitForTimeout(600)
store = await page.evaluate(() => JSON.parse(localStorage.getItem('profile-workshop:workflow:v1')))
target = store.orders.find((o) => o.id === assignedOrder.id)
check('质检打回累加返工次数', target.status === 'rework' && target.reworkTimes >= 1, `${target.status}, 返工 ${target.reworkTimes} 次`)

await page.getByRole('button', { name: '看板' }).click()
await page.waitForTimeout(600)
const boardText = await page.locator('.page').innerText()
check('看板显示完成量与返工', /返工合计/.test(boardText) && /一次性通过率/.test(boardText))

check('无运行时报错', errors.length === 0, errors.slice(0, 3).join(' | '))

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n== 汇总：${results.length - failed.length}/${results.length} 通过 ==`)
if (failed.length) {
  console.log('失败项：')
  for (const f of failed) console.log(' - ' + f.name + (f.detail ? ' — ' + f.detail : ''))
  process.exitCode = 1
}

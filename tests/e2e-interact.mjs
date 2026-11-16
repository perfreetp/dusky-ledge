// 真实指针交互：切到矩形工具 -> 在画布按下拖动松开 -> 验证形状落入 store 并渲染
const port = 9223
const wsUrl = (await (await fetch(`http://localhost:${port}/json/new?http://localhost:5173/`, { method: 'PUT' })).json()).webSocketDebuggerUrl
const ws = new WebSocket(wsUrl)
let id = 0; const pending = new Map(); const logs = []
const send = (method, params = {}) => new Promise(res => { const m = ++id; pending.set(m, res); ws.send(JSON.stringify({ id: m, method, params })) })
ws.addEventListener('message', ev => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id) }
  if (msg.method === 'Runtime.exceptionThrown') logs.push('EXC: ' + (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text))
})
await new Promise(r => ws.addEventListener('open', r))
await send('Runtime.enable'); await send('Page.enable'); await new Promise(r => setTimeout(r, 2200))
const ev = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value

// 取画布位置
const box = await ev(`(()=>{const c=document.querySelector('.canvas-wrap canvas');const r=c.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()`)
function mouse(type, x, y, buttons = 0) {
  return send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons, clickCount: 1, pointerType: 'mouse' })
}

// 1) 点击矩形工具按钮
await ev(`[...document.querySelectorAll('.topbar button')].find(b=>b.textContent.includes('矩形')).click()`)
const toolAfter = await ev(`window.__s||null`) // 占位
// 2) 在画布上拖出矩形（屏幕坐标，世界坐标经 view 变换）
const x0 = box.x + 300, y0 = box.y + 300, x1 = box.x + 450, y1 = box.y + 380
await mouse('mousePressed', x0, y0, 1)
for (let i = 1; i <= 5; i++) await mouse('mouseMoved', x0 + (x1 - x0) * i / 5, y0 + (y1 - y0) * i / 5, 1)
await mouse('mouseReleased', x1, y1, 0)
await new Promise(r => setTimeout(r, 400))

const shapeCount = await ev(`document.querySelectorAll('.shape-item').length`)
const shapeName = await ev(`document.querySelector('.shape-item .name')?.value`)
const metricText = await ev(`document.querySelector('.canvas-wrap')?.innerText`)
// 3) 再画第二个矩形，然后多选做对齐按钮可用性
await mouse('mousePressed', box.x + 500, box.y + 250, 1)
await mouse('mouseReleased', box.x + 600, box.y + 320, 0)
await new Promise(r => setTimeout(r, 300))
const count2 = await ev(`document.querySelectorAll('.shape-item').length`)

// 4) 验证撤销可用且能回退
const undoDisabledBefore = await ev(`document.querySelector('.topbar button[title="撤销 (Ctrl+Z)"]').disabled`)
await ev(`[...document.querySelectorAll('.topbar button')].find(b=>b.title==='撤销 (Ctrl+Z)').click()`)
await new Promise(r => setTimeout(r, 200))
const afterUndo = await ev(`document.querySelectorAll('.shape-item').length`)

console.log(JSON.stringify({
  canvasSize: { w: Math.round(box.w), h: Math.round(box.h) },
  shapeAfterFirstDraw: shapeCount,
  firstName: shapeName,
  shapeAfterSecondDraw: count2,
  undoButtonDisabledBefore: undoDisabledBefore,
  shapeAfterUndo: afterUndo,
  hud: metricText?.replace(/\s+/g, ' ').slice(0, 120),
}, null, 2))
console.log(logs.length ? 'EXCEPTIONS:\n' + logs.join('\n') : 'no exceptions')
ws.close(); process.exit(0)

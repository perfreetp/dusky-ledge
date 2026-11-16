// 验证 Canvas2D 渲染器在真实浏览器里产出非空像素，并验证版本 diff
const wsUrl = (await (await fetch('http://localhost:9222/json/new?http://localhost:5173/', { method: 'PUT' })).json()).webSocketDebuggerUrl
const ws = new WebSocket(wsUrl)
let id = 0; const pending = new Map(); const logs = []
const send = (method, params = {}) => new Promise(res => { const m = ++id; pending.set(m, res); ws.send(JSON.stringify({ id: m, method, params })) })
ws.addEventListener('message', ev => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id) }
  if (msg.method === 'Runtime.exceptionThrown') logs.push('EXC: ' + JSON.stringify(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text))
})
await new Promise(r => ws.addEventListener('open', r))
await send('Runtime.enable'); await send('Page.enable'); await new Promise(r => setTimeout(r, 2000))
const ev = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value

const out = await ev(`(async () => {
  const R = await import('/src/lib/renderer.ts')
  const V = await import('/src/lib/view.ts')
  const geo = await import('/src/lib/geometry.ts')
  const diff = await import('/src/lib/diff.ts')
  const mk = (id, c) => ({ id, name:id, layerId:'L', color:'#38bdf8', contours:[c], createdAt:0 })
  const doc = { projectNo:'P', equipmentNo:'E', equipmentName:'d', gridSize:100,
    layers:[{id:'L',name:'层',visible:true,locked:false,color:'#38bdf8'}],
    shapes:[ mk('rect', geo.rectContour({x:0,y:0},{x:200,y:100})), mk('circ', geo.circleContour({x:300,y:50},40)) ] }
  const cv = document.createElement('canvas')
  const view = V.createView()
  R.renderCanvas(cv, view, { doc, selection:new Set(['rect']), activeNode:null, showGrid:true,
    guides:[], annotations:[{id:'a',point:{x:10,y:10},text:'t',author:'r',createdAt:0,replies:[],status:'open'}], width:800, height:600 })
  const data = cv.getContext('2d').getImageData(0,0,800,600).data
  let nonBg=0
  for (let i=0;i<data.length;i+=4){ if (!(data[i]===15&&data[i+1]===23&&data[i+2]===42)) nonBg++ }
  // diff：新版把矩形右移 50mm，应产生差异段
  const doc2 = structuredClone(doc)
  doc2.shapes[0] = mk('rect2', geo.rectContour({x:50,y:0},{x:250,y:100}))
  const d = diff.diffDocs(doc, doc2)
  return {
    canvasW: cv.width, canvasH: cv.height,
    nonBackgroundPixels: nonBg,
    rendersSomething: nonBg > 1000,
    diffSegments: d.removed.length + d.added.length,
    diffLengthMm: Math.round(d.diffLength),
  }
})()`)
console.log(JSON.stringify(out, null, 2))
console.log(logs.length ? 'EXCEPTIONS:\n' + logs.join('\n') : 'no exceptions')
ws.close(); process.exit(0)

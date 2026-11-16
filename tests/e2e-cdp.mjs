// 通过 Chrome DevTools Protocol 在真实浏览器页面里端到端验证核心功能
const base = 'http://localhost:9222'

async function getWs() {
  // 新建一个标签页指向应用
  const target = await (await fetch(`${base}/json/new?http://localhost:5173/`, { method: 'PUT' })).json()
  return target.webSocketDebuggerUrl
}

const wsUrl = await getWs()
const ws = new WebSocket(wsUrl)
let id = 0
const pending = new Map()
const logs = []

function send(method, params = {}) {
  return new Promise(resolve => {
    const mid = ++id
    pending.set(mid, resolve)
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
}

ws.addEventListener('message', ev => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id) }
  if (msg.method === 'Runtime.consoleAPICalled') {
    logs.push(msg.params.args.map(a => a.value ?? a.description).join(' '))
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    logs.push('EXCEPTION: ' + JSON.stringify(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text))
  }
})

await new Promise(r => ws.addEventListener('open', r))
await send('Runtime.enable')
await send('Page.enable')
await new Promise(r => setTimeout(r, 2500))

async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) return { error: r.exceptionDetails.exception?.description ?? r.exceptionDetails.text }
  return r.result.value
}

const results = {}

// 1) 模块与基础挂载
results.title = await evalJs('document.title')
results.navButtons = await evalJs(`[...document.querySelectorAll('.nav button')].map(b=>b.textContent.trim())`)

// 2) 通过应用内部逻辑在真实模块系统里验证 Worker 布尔（动态 import 工程模块）
results.workerBoolean = await evalJs(`(async () => {
  const bc = await import('/src/lib/booleanClient.ts')
  const geo = await import('/src/lib/geometry.ts')
  const mk = (id, c) => ({ id, name:id, layerId:'L', color:'#000', contours:[c], createdAt:0 })
  const a = mk('a', geo.rectContour({x:0,y:0},{x:10,y:10}))
  const b = mk('b', geo.rectContour({x:5,y:0},{x:15,y:10}))
  const out = await bc.booleanClient.run([a],[b],'union',{id:'r',name:'r',layerId:'L',color:'#000',version:'v1'})
  const area = out.result.contours.reduce((s,c)=>s+Math.abs(geo.polygonArea(c.points)),0)
  return {
    threaded: out.threaded,
    ms: Math.round(out.ms*100)/100,
    fingerprint: out.fingerprint,
    contourCount: out.result.contours.length,
    area: Math.round(area),
    allLineEditable: out.result.contours.every(c=>c.segments.every(s=>s.type==='line')),
    nodeCount: out.result.contours.reduce((n,c)=>n+c.points.length,0),
  }
})()`)

// 3) 版本存储：提交 + 检索
results.versionFlow = await evalJs(`(async () => {
  const vs = await import('/src/lib/versionStore.ts')
  const doc = { projectNo:'PRJ-X', equipmentNo:'EQ-99', equipmentName:'端到端设备', gridSize:100,
    layers:[{id:'L',name:'层',visible:true,locked:false,color:'#000'}], shapes:[] }
  const rec = vs.versionStore.add({ projectNo:doc.projectNo, equipmentNo:doc.equipmentNo,
    equipmentName:doc.equipmentName, version:'v1', doc, submitter:'测试', note:'端到端', annotations:[] })
  const found = vs.versionStore.search('EQ-99')
  const nextV = vs.versionStore.nextVersion('PRJ-X','EQ-99')
  vs.versionStore.remove(rec.id)
  return { savedAndFound: found.some(r=>r.id===rec.id), nextVersion: nextV, cleaned: !vs.versionStore.get(rec.id) }
})()`)

// 4) 撤销栈容量
results.history = await evalJs(`(async () => {
  const { History } = await import('/src/lib/history.ts')
  const h = new History({n:0})
  for (let i=1;i<=120;i++) h.commit({n:i}, 'step'+i)
  let undone=0
  while (h.undo()!==null) undone++
  return { capacity: undone, meets50: undone>=50 }
})()`)

// 5) UI 工具按钮数量
results.toolCount = await evalJs(`document.querySelectorAll('.topbar button[title]').length`)

console.log(JSON.stringify(results, null, 2))
console.log('--- browser logs ---')
console.log(logs.length ? logs.join('\n') : '(no console output / exceptions)')
ws.close()
process.exit(0)

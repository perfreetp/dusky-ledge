// IndexedDB 档案库:stones(石块建档)+ versions(加工版本)
const DB_NAME = 'taihu-archive'
const DB_VER = 1

let dbPromise = null

function open() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('stones')) {
        db.createObjectStore('stones', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('versions')) {
        const v = db.createObjectStore('versions', { keyPath: 'id', autoIncrement: true })
        v.createIndex('stoneId', 'stoneId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const os = t.objectStore(store)
    const out = fn(os)
    t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out)
    t.onerror = () => reject(t.error)
  })
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function listStones() {
  const db = await open()
  return reqToPromise(db.transaction('stones').objectStore('stones').getAll())
}

export async function addStone(stone) {
  const db = await open()
  return reqToPromise(db.transaction('stones', 'readwrite').objectStore('stones').add(stone))
}

export async function updateStone(stone) {
  const db = await open()
  return reqToPromise(db.transaction('stones', 'readwrite').objectStore('stones').put(stone))
}

export async function deleteStone(id) {
  const db = await open()
  await reqToPromise(db.transaction('stones', 'readwrite').objectStore('stones').delete(id))
  // 连带删除版本
  const vers = await listVersions(id)
  const t = db.transaction('versions', 'readwrite')
  const os = t.objectStore('versions')
  for (const v of vers) os.delete(v.id)
  return new Promise((resolve, reject) => {
    t.oncomplete = resolve
    t.onerror = () => reject(t.error)
  })
}

export async function listVersions(stoneId) {
  const db = await open()
  const all = await reqToPromise(
    db.transaction('versions').objectStore('versions').index('stoneId').getAll(stoneId)
  )
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function listAllVersions() {
  const db = await open()
  return reqToPromise(db.transaction('versions').objectStore('versions').getAll())
}

export async function addVersion(ver) {
  const db = await open()
  return reqToPromise(db.transaction('versions', 'readwrite').objectStore('versions').add(ver))
}

export async function updateVersion(ver) {
  const db = await open()
  return reqToPromise(db.transaction('versions', 'readwrite').objectStore('versions').put(ver))
}

export async function deleteVersion(id) {
  const db = await open()
  return reqToPromise(db.transaction('versions', 'readwrite').objectStore('versions').delete(id))
}

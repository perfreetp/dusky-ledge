// 版本历史：localStorage 持久化，支持按项目号/设备编号检索
import type { VersionRecord } from '../types.ts'
import { uid } from './utils.ts'

const KEY = 'sfow.versions.v1'

function loadAll(): VersionRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as VersionRecord[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function saveAll(records: VersionRecord[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(records))
  } catch (e) {
    console.warn('版本历史持久化失败（可能超出配额）', e)
  }
}

export const versionStore = {
  list(): VersionRecord[] {
    return loadAll().sort((a, b) => b.createdAt - a.createdAt)
  },

  get(id: string): VersionRecord | undefined {
    return loadAll().find(r => r.id === id)
  },

  add(rec: Omit<VersionRecord, 'id' | 'createdAt'>): VersionRecord {
    const all = loadAll()
    const full: VersionRecord = { ...rec, id: uid('ver'), createdAt: Date.now() }
    all.push(full)
    saveAll(all)
    return full
  },

  update(id: string, patch: Partial<VersionRecord>): VersionRecord | undefined {
    const all = loadAll()
    const i = all.findIndex(r => r.id === id)
    if (i < 0) return undefined
    all[i] = { ...all[i], ...patch }
    saveAll(all)
    return all[i]
  },

  remove(id: string) {
    saveAll(loadAll().filter(r => r.id !== id))
  },

  /** 按项目号或设备编号模糊检索（大小写不敏感） */
  search(keyword: string): VersionRecord[] {
    const k = keyword.trim().toLowerCase()
    const all = this.list()
    if (!k) return all
    return all.filter(r =>
      r.projectNo.toLowerCase().includes(k) ||
      r.equipmentNo.toLowerCase().includes(k) ||
      r.equipmentName.toLowerCase().includes(k) ||
      r.version.toLowerCase().includes(k),
    )
  },

  /** 同一设备的下一版本号：v1 -> v2 */
  nextVersion(projectNo: string, equipmentNo: string): string {
    const same = loadAll().filter(
      r => r.projectNo === projectNo && r.equipmentNo === equipmentNo,
    )
    return `v${same.length + 1}`
  },
}

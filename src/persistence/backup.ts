/** 整库 JSON 备份与恢复（带 schema 版本校验）。 */
import type { Annotation, VersionSnapshot } from '../types';
import { DB_NAME, DB_VERSION, getDB, type WorkspaceDoc } from './db';

export interface BackupFile {
  format: 'karst-cave-backup';
  schemaVersion: number;
  exportedAt: string;
  data: {
    projects: WorkspaceDoc[];
    versions: VersionSnapshot[];
    annotations: Annotation[];
  };
}

export async function exportBackup(exportedAtIso: string): Promise<BackupFile> {
  const db = await getDB();
  const [projects, versions, annotations] = await Promise.all([
    db.getAll('projects'),
    db.getAll('versions'),
    db.getAll('annotations'),
  ]);
  return {
    format: 'karst-cave-backup',
    schemaVersion: DB_VERSION,
    exportedAt: exportedAtIso,
    data: { projects, versions, annotations },
  };
}

export async function importBackup(file: BackupFile): Promise<void> {
  if (file.format !== 'karst-cave-backup') throw new Error('不是有效的喀斯特工作台备份文件');
  if (file.schemaVersion > DB_VERSION) throw new Error('备份来自更新版本，无法导入');
  const db = await getDB();
  const tx = db.transaction(['projects', 'versions', 'annotations'], 'readwrite');
  await Promise.all([tx.objectStore('projects').clear(), tx.objectStore('versions').clear(), tx.objectStore('annotations').clear()]);
  await Promise.all([
    ...file.data.projects.map((d) => tx.objectStore('projects').put(d)),
    ...file.data.versions.map((d) => tx.objectStore('versions').put(d)),
    ...file.data.annotations.map((d) => tx.objectStore('annotations').put(d)),
  ]);
  await tx.done;
}

export { DB_NAME };

import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type {
  PlanDoc,
  PlanRecord,
  Submission,
  TeacherReview,
  TrainingTask,
  VersionRecord,
  Workshop,
} from '../shared/types';

const DB_PATH = process.env.DB_PATH ?? resolve(process.cwd(), 'data', 'workshop.db');

export interface Db {
  raw: DatabaseSync;
}

export function openDb(path = DB_PATH): Db {
  if (path !== ':memory:') {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db);
  return { raw: db };
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workshops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      workshop_id TEXT,
      name TEXT NOT NULL,
      doc TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_plans_workshop ON plans(workshop_id);
    CREATE TABLE IF NOT EXISTS versions (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      name TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '',
      doc TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_versions_plan ON versions(plan_id);
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      workshop_id TEXT,
      base_doc TEXT NOT NULL,
      reference_doc TEXT,
      requirements TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      published INTEGER NOT NULL DEFAULT 0,
      deadline TEXT
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      doc TEXT NOT NULL,
      auto_grade TEXT,
      review TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      submitted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_task ON submissions(task_id);
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mime TEXT NOT NULL,
      data BLOB NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

const now = () => new Date().toISOString();
const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------------------
// Workshops
// ---------------------------------------------------------------------------

export function listWorkshops(db: Db): Workshop[] {
  const rows = db.raw.prepare('SELECT * FROM workshops ORDER BY created_at ASC').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    description: r.description,
    createdAt: r.created_at,
  }));
}

export function upsertWorkshop(db: Db, input: Partial<Workshop> & { name: string }): Workshop {
  const existing = input.id
    ? (db.raw.prepare('SELECT * FROM workshops WHERE id = ?').get(input.id) as any | undefined)
    : undefined;
  if (existing) {
    db.raw
      .prepare('UPDATE workshops SET name = ?, code = ?, description = ? WHERE id = ?')
      .run(input.name, input.code ?? existing.code, input.description ?? existing.description, existing.id);
    return listWorkshops(db).find((w) => w.id === existing.id)!;
  }
  const id = input.id ?? uid('ws');
  db.raw
    .prepare('INSERT INTO workshops (id, name, code, description, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, input.name, input.code ?? '', input.description ?? '', now());
  return listWorkshops(db).find((w) => w.id === id)!;
}

export function deleteWorkshop(db: Db, id: string) {
  db.raw.prepare('DELETE FROM workshops WHERE id = ?').run(id);
  db.raw.prepare('UPDATE plans SET workshop_id = NULL WHERE workshop_id = ?').run(id);
}

// ---------------------------------------------------------------------------
// Plans & versions
// ---------------------------------------------------------------------------

export function listPlans(db: Db, workshopId?: string | null): PlanRecord[] {
  const rows = (
    workshopId
      ? db.raw.prepare('SELECT * FROM plans WHERE workshop_id = ? ORDER BY updated_at DESC').all(workshopId)
      : db.raw.prepare('SELECT * FROM plans ORDER BY updated_at DESC').all()
  ) as any[];
  return rows.map(rowToPlan);
}

function rowToPlan(r: any): PlanRecord {
  return {
    id: r.id,
    workshopId: r.workshop_id,
    name: r.name,
    doc: JSON.parse(r.doc),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function getPlan(db: Db, id: string): PlanRecord | null {
  const r = db.raw.prepare('SELECT * FROM plans WHERE id = ?').get(id) as any | undefined;
  return r ? rowToPlan(r) : null;
}

export function savePlan(
  db: Db,
  input: { id?: string; name: string; workshopId: string | null; doc: PlanDoc },
  opts: { versionName?: string; versionNote?: string; author?: string; createVersion?: boolean } = {}
): PlanRecord {
  const timestamp = now();
  let id = input.id;
  if (id) {
    const exists = db.raw.prepare('SELECT id FROM plans WHERE id = ?').get(id);
    if (!exists) id = undefined;
  }
  if (!id) {
    id = uid('plan');
    db.raw
      .prepare('INSERT INTO plans (id, workshop_id, name, doc, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, input.workshopId, input.name, JSON.stringify(input.doc), timestamp, timestamp);
  } else {
    db.raw
      .prepare('UPDATE plans SET workshop_id = ?, name = ?, doc = ?, updated_at = ? WHERE id = ?')
      .run(input.workshopId, input.name, JSON.stringify(input.doc), timestamp, id);
  }
  if (opts.createVersion) {
    createVersion(db, {
      planId: id,
      name: opts.versionName ?? `v${countVersions(db, id) + 1}`,
      note: opts.versionNote ?? '',
      author: opts.author ?? '',
      doc: input.doc,
    });
  }
  return getPlan(db, id)!;
}

export function deletePlan(db: Db, id: string) {
  db.raw.prepare('DELETE FROM plans WHERE id = ?').run(id);
  db.raw.prepare('DELETE FROM versions WHERE plan_id = ?').run(id);
}

export function listVersions(db: Db, planId: string): VersionRecord[] {
  const rows = db.raw
    .prepare('SELECT * FROM versions WHERE plan_id = ? ORDER BY created_at DESC')
    .all(planId) as any[];
  return rows.map(rowToVersion);
}

function rowToVersion(r: any): VersionRecord {
  return {
    id: r.id,
    planId: r.plan_id,
    name: r.name,
    note: r.note,
    author: r.author,
    doc: JSON.parse(r.doc),
    createdAt: r.created_at,
  };
}

export function countVersions(db: Db, planId: string): number {
  const r = db.raw.prepare('SELECT COUNT(*) as c FROM versions WHERE plan_id = ?').get(planId) as any;
  return Number(r?.c ?? 0);
}

export function getVersion(db: Db, id: string): VersionRecord | null {
  const r = db.raw.prepare('SELECT * FROM versions WHERE id = ?').get(id) as any | undefined;
  return r ? rowToVersion(r) : null;
}

export function createVersion(
  db: Db,
  input: { planId: string; name: string; note: string; author: string; doc: PlanDoc }
): VersionRecord {
  const id = uid('ver');
  db.raw
    .prepare(
      'INSERT INTO versions (id, plan_id, name, note, author, doc, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(id, input.planId, input.name, input.note, input.author, JSON.stringify(input.doc), now());
  return getVersion(db, id)!;
}

export function deleteVersion(db: Db, id: string) {
  db.raw.prepare('DELETE FROM versions WHERE id = ?').run(id);
}

// ---------------------------------------------------------------------------
// Training tasks
// ---------------------------------------------------------------------------

function rowToTask(r: any): TrainingTask {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    workshopId: r.workshop_id,
    baseDoc: JSON.parse(r.base_doc),
    referenceDoc: r.reference_doc ? JSON.parse(r.reference_doc) : null,
    requirements: JSON.parse(r.requirements),
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    published: !!r.published,
    deadline: r.deadline,
  };
}

export function listTasks(db: Db): TrainingTask[] {
  const rows = db.raw.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as any[];
  return rows.map(rowToTask);
}

export function getTask(db: Db, id: string): TrainingTask | null {
  const r = db.raw.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any | undefined;
  return r ? rowToTask(r) : null;
}

export function saveTask(db: Db, input: Partial<TrainingTask> & { title: string; baseDoc: PlanDoc; requirements: TrainingTask['requirements'] }): TrainingTask {
  const timestamp = now();
  if (input.id) {
    const exists = db.raw.prepare('SELECT id FROM tasks WHERE id = ?').get(input.id) as any;
    if (exists) {
      db.raw
        .prepare(
          'UPDATE tasks SET title=?, description=?, workshop_id=?, base_doc=?, reference_doc=?, requirements=?, updated_at=?, published=?, deadline=? WHERE id=?'
        )
        .run(
          input.title,
          input.description ?? '',
          input.workshopId ?? null,
          JSON.stringify(input.baseDoc),
          input.referenceDoc ? JSON.stringify(input.referenceDoc) : null,
          JSON.stringify(input.requirements),
          timestamp,
          input.published ? 1 : 0,
          input.deadline ?? null,
          input.id
        );
      return getTask(db, input.id)!;
    }
  }
  const id = input.id ?? uid('task');
  db.raw
    .prepare(
      'INSERT INTO tasks (id, title, description, workshop_id, base_doc, reference_doc, requirements, created_by, created_at, updated_at, published, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      id,
      input.title,
      input.description ?? '',
      input.workshopId ?? null,
      JSON.stringify(input.baseDoc),
      input.referenceDoc ? JSON.stringify(input.referenceDoc) : null,
      JSON.stringify(input.requirements),
      input.createdBy ?? '',
      timestamp,
      timestamp,
      input.published ? 1 : 0,
      input.deadline ?? null
    );
  return getTask(db, id)!;
}

export function deleteTask(db: Db, id: string) {
  db.raw.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  db.raw.prepare('DELETE FROM submissions WHERE task_id = ?').run(id);
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

function rowToSubmission(r: any): Submission {
  return {
    id: r.id,
    taskId: r.task_id,
    studentName: r.student_name,
    doc: JSON.parse(r.doc),
    autoGrade: r.auto_grade ? JSON.parse(r.auto_grade) : null,
    review: r.review ? JSON.parse(r.review) : null,
    status: r.status,
    submittedAt: r.submitted_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listSubmissions(db: Db, taskId?: string): Submission[] {
  const rows = (
    taskId
      ? db.raw.prepare('SELECT * FROM submissions WHERE task_id = ? ORDER BY updated_at DESC').all(taskId)
      : db.raw.prepare('SELECT * FROM submissions ORDER BY updated_at DESC').all()
  ) as any[];
  return rows.map(rowToSubmission);
}

export function getSubmission(db: Db, id: string): Submission | null {
  const r = db.raw.prepare('SELECT * FROM submissions WHERE id = ?').get(id) as any | undefined;
  return r ? rowToSubmission(r) : null;
}

export function saveSubmission(
  db: Db,
  input: {
    id?: string;
    taskId: string;
    studentName: string;
    doc: PlanDoc;
    autoGrade?: Submission['autoGrade'];
    review?: TeacherReview | null;
    status?: Submission['status'];
    submittedAt?: string | null;
  }
): Submission {
  const timestamp = now();
  if (input.id) {
    const existing = getSubmission(db, input.id);
    if (existing) {
      db.raw
        .prepare(
          'UPDATE submissions SET student_name=?, doc=?, auto_grade=?, review=?, status=?, submitted_at=?, updated_at=? WHERE id=?'
        )
        .run(
          input.studentName,
          JSON.stringify(input.doc),
          input.autoGrade !== undefined ? (input.autoGrade ? JSON.stringify(input.autoGrade) : null) : existing.autoGrade ? JSON.stringify(existing.autoGrade) : null,
          input.review !== undefined ? (input.review ? JSON.stringify(input.review) : null) : existing.review ? JSON.stringify(existing.review) : null,
          input.status ?? existing.status,
          input.submittedAt !== undefined ? input.submittedAt : existing.submittedAt,
          timestamp,
          input.id
        );
      return getSubmission(db, input.id)!;
    }
  }
  const id = input.id ?? uid('sub');
  db.raw
    .prepare(
      'INSERT INTO submissions (id, task_id, student_name, doc, auto_grade, review, status, submitted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      id,
      input.taskId,
      input.studentName,
      JSON.stringify(input.doc),
      input.autoGrade ? JSON.stringify(input.autoGrade) : null,
      input.review ? JSON.stringify(input.review) : null,
      input.status ?? 'draft',
      input.submittedAt ?? null,
      timestamp,
      timestamp
    );
  return getSubmission(db, id)!;
}

export function deleteSubmission(db: Db, id: string) {
  db.raw.prepare('DELETE FROM submissions WHERE id = ?').run(id);
}

// ---------------------------------------------------------------------------
// Assets (background floor plans)
// ---------------------------------------------------------------------------

export function saveAsset(db: Db, name: string, mime: string, data: Uint8Array): string {
  const id = uid('asset');
  db.raw
    .prepare('INSERT INTO assets (id, name, mime, data, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, mime, data, now());
  return id;
}

export function getAsset(db: Db, id: string): { name: string; mime: string; data: Uint8Array } | null {
  const r = db.raw.prepare('SELECT * FROM assets WHERE id = ?').get(id) as any | undefined;
  if (!r) return null;
  return { name: r.name, mime: r.mime, data: r.data as Uint8Array };
}

export function assetUrl(id: string): string {
  return `/api/assets/${id}`;
}

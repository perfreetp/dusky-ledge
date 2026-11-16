import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assetUrl,
  countVersions,
  createVersion,
  deletePlan,
  deleteSubmission,
  deleteTask,
  deleteVersion,
  deleteWorkshop,
  getAsset,
  getPlan,
  getSubmission,
  getTask,
  listPlans,
  listSubmissions,
  listTasks,
  listVersions,
  listWorkshops,
  openDb,
  saveAsset,
  savePlan,
  saveSubmission,
  saveTask,
  upsertWorkshop,
} from './db';
import { gradeSubmission } from '../src/core/grading';
import type { PlanDoc, TeacherReview } from '../shared/types';

const app = express();
const db = openDb(process.env.DB_PATH);
const PORT = Number(process.env.PORT ?? 8787);

app.use(express.json({ limit: '48mb' }));

const api = express.Router();

api.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ---- workshops -------------------------------------------------------------

api.get('/workshops', (_req, res) => res.json(listWorkshops(db)));
api.post('/workshops', (req, res) => {
  const { name, code, description, id } = req.body ?? {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: '名称必填' });
  res.json(upsertWorkshop(db, { id, name, code, description }));
});
api.delete('/workshops/:id', (req, res) => {
  deleteWorkshop(db, req.params.id);
  res.json({ ok: true });
});

// ---- plans -----------------------------------------------------------------

api.get('/plans', (req, res) => {
  const workshopId = typeof req.query.workshopId === 'string' ? req.query.workshopId : undefined;
  res.json(listPlans(db, workshopId ?? undefined));
});

api.get('/plans/:id', (req, res) => {
  const plan = getPlan(db, req.params.id);
  if (!plan) return res.status(404).json({ error: '方案不存在' });
  res.json(plan);
});

api.get('/plans/:id/versions', (req, res) => {
  res.json(listVersions(db, req.params.id));
});

api.post('/plans/:id/versions', (req, res) => {
  const plan = getPlan(db, req.params.id);
  if (!plan) return res.status(404).json({ error: '方案不存在' });
  const { name, note, author, doc } = req.body ?? {};
  const v = createVersion(db, {
    planId: plan.id,
    name: name || `v${countVersions(db, plan.id) + 1}`,
    note: note ?? '',
    author: author ?? '',
    doc: (doc as PlanDoc) ?? plan.doc,
  });
  res.json(v);
});

api.delete('/plans/:id/versions/:versionId', (req, res) => {
  deleteVersion(db, req.params.versionId);
  res.json({ ok: true });
});

api.post('/plans', (req, res) => {
  const { id, name, workshopId, doc, versionName, versionNote, author, createVersion: makeVersion } = req.body ?? {};
  if (!doc || !name) return res.status(400).json({ error: 'name 和 doc 必填' });
  const plan = savePlan(
    db,
    { id, name, workshopId: workshopId ?? null, doc },
    {
      createVersion: !!makeVersion,
      versionName,
      versionNote,
      author,
      // every save keeps a version when asked by the caller (explicit publishing)
    }
  );
  res.json(plan);
});

api.delete('/plans/:id', (req, res) => {
  deletePlan(db, req.params.id);
  res.json({ ok: true });
});

// ---- assets ----------------------------------------------------------------

api.post('/assets', express.raw({ type: ['image/*', 'application/pdf'], limit: '24mb' }), (req, res) => {
  const mime = req.headers['content-type'] ?? 'application/octet-stream';
  const buf = req.body as Buffer;
  if (!buf?.length) return res.status(400).json({ error: '空文件' });
  const name = String(req.headers['x-file-name'] ?? 'floorplan');
  const id = saveAsset(db, decodeURIComponent(name), mime, new Uint8Array(buf));
  res.json({ id, url: assetUrl(id) });
});

api.get('/assets/:id', (req, res) => {
  const a = getAsset(db, req.params.id);
  if (!a) return res.status(404).end();
  res.setHeader('Content-Type', a.mime);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.end(Buffer.from(a.data));
});

// ---- training tasks --------------------------------------------------------

/**
 * Task listing/detail. The reference drawing is the answer key, so it is only
 * returned for teacher view (`?role=teacher`) — a student client gets the base
 * floor plan and the requirement list without the solution geometry.
 */
const forRole = (t: ReturnType<typeof listTasks>[number], role?: string) =>
  role === 'teacher' ? t : { ...t, referenceDoc: null };

api.get('/tasks', (req, res) => {
  const role = typeof req.query.role === 'string' ? req.query.role : undefined;
  res.json(listTasks(db).map((t) => forRole(t, role)));
});
api.get('/tasks/:id', (req, res) => {
  const t = getTask(db, req.params.id);
  if (!t) return res.status(404).json({ error: '任务不存在' });
  const role = typeof req.query.role === 'string' ? req.query.role : undefined;
  res.json(forRole(t, role));
});

api.post('/tasks', (req, res) => {
  const body = req.body ?? {};
  if (!body.title || !body.baseDoc || !body.requirements) {
    return res.status(400).json({ error: 'title / baseDoc / requirements 必填' });
  }
  res.json(saveTask(db, body));
});

api.post('/tasks/:id/publish', (req, res) => {
  const t = getTask(db, req.params.id);
  if (!t) return res.status(404).json({ error: '任务不存在' });
  res.json(saveTask(db, { ...t, published: req.body?.published ?? true, deadline: req.body?.deadline ?? t.deadline }));
});

api.delete('/tasks/:id', (req, res) => {
  deleteTask(db, req.params.id);
  res.json({ ok: true });
});

// ---- submissions & grading --------------------------------------------------

api.get('/submissions', (req, res) => {
  const taskId = typeof req.query.taskId === 'string' ? req.query.taskId : undefined;
  res.json(listSubmissions(db, taskId));
});

api.get('/submissions/:id', (req, res) => {
  const s = getSubmission(db, req.params.id);
  if (!s) return res.status(404).json({ error: '提交不存在' });
  res.json(s);
});

/**
 * Upload/submit a student drawing. The server holds the reference document, so a
 * student client can never read it — it only ever gets the graded result back.
 */
api.post('/submissions', (req, res) => {
  const { id, taskId, studentName, doc, submit } = req.body ?? {};
  if (!taskId || !studentName || !doc) return res.status(400).json({ error: 'taskId / studentName / doc 必填' });
  const task = getTask(db, taskId);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  const reference = task.referenceDoc;
  const autoGrade = reference ? gradeSubmission(doc as PlanDoc, reference, task.requirements) : null;
  const submission = saveSubmission(db, {
    id,
    taskId,
    studentName,
    doc,
    autoGrade,
    status: submit ? 'submitted' : 'draft',
    submittedAt: submit ? new Date().toISOString() : null,
  });
  // The student client never receives the reference document; strip it from the echo.
  res.json({ ...submission, doc: submission.doc });
});

api.post('/submissions/:id/review', (req, res) => {
  const sub = getSubmission(db, req.params.id);
  if (!sub) return res.status(404).json({ error: '提交不存在' });
  const { finalScore, remark, adjustedItems, reviewer } = req.body ?? {};
  const review: TeacherReview = {
    finalScore: finalScore == null ? null : Math.max(0, Math.min(100, Number(finalScore))),
    remark: remark ?? '',
    adjustedItems: adjustedItems ?? [],
    reviewer: reviewer ?? '',
    reviewedAt: new Date().toISOString(),
  };
  res.json(
    saveSubmission(db, {
      id: sub.id,
      taskId: sub.taskId,
      studentName: sub.studentName,
      doc: sub.doc,
      autoGrade: sub.autoGrade,
      review,
      status: 'reviewed',
      submittedAt: sub.submittedAt,
    })
  );
});

api.delete('/submissions/:id', (req, res) => {
  deleteSubmission(db, req.params.id);
  res.json({ ok: true });
});

api.get('/tasks/:id/summary', (req, res) => {
  const task = getTask(db, req.params.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  const subs = listSubmissions(db, task.id);
  const submitted = subs.filter((s) => s.status !== 'draft');
  const reviewed = subs.filter((s) => s.review?.finalScore != null);
  // Rank on the reviewed score when present, otherwise the auto score, so a class
  // shows real numbers before the teacher has finished reviewing everyone.
  const scoreOf = (s: (typeof subs)[number]) => s.review?.finalScore ?? s.autoGrade?.score ?? 0;
  const scores = submitted.map(scoreOf);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const max = scores.length ? Math.max(...scores) : 0;
  const min = scores.length ? Math.min(...scores) : 0;
  const pass = scores.filter((s) => s >= 60).length;
  const wrong = new Map<string, { title: string; type: string; count: number }>();
  for (const s of submitted) {
    for (const item of s.autoGrade?.items ?? []) {
      // aggregate by title without the per-object id noise
      const key = item.type + '|' + item.title;
      const cur = wrong.get(key);
      if (cur) cur.count++;
      else wrong.set(key, { title: item.title, type: item.type, count: 1 });
    }
  }
  const wrongList = [...wrong.values()].sort((a, b) => b.count - a.count);
  res.json({
    task: { id: task.id, title: task.title },
    counts: { total: subs.length, submitted: submitted.length, reviewed: reviewed.length, pass },
    stats: { avg: Math.round(avg * 10) / 10, max, min, passRate: scores.length ? Math.round((pass / scores.length) * 1000) / 10 : 0 },
    students: subs.map((s) => ({
      id: s.id,
      studentName: s.studentName,
      status: s.status,
      autoScore: s.autoGrade?.score ?? null,
      finalScore: s.review?.finalScore ?? null,
      submittedAt: s.submittedAt,
      wrongCount: s.autoGrade?.items.filter((i) => i.deduction > 0).length ?? 0,
      topWrong: s.autoGrade?.items.filter((i) => i.deduction > 0).slice(0, 3).map((i) => i.title) ?? [],
    })),
    wrongList,
  });
});

app.use('/api', api);

// ---- static build (production) ---------------------------------------------

const dist = resolve(process.cwd(), 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(resolve(dist, 'index.html'));
  });
}

// On a brand-new database, seed one demo workshop + plan + training task so the
// app is immediately explorable. `npm run seed` does the same thing explicitly.
if (listWorkshops(db).length === 0) {
  try {
    const { seedDemo } = await import('./seed-demo');
    seedDemo(db);
    console.log('[api] empty database — seeded demo workshop, plan and training task');
  } catch (e) {
    console.warn('[api] demo seed skipped:', (e as Error).message);
  }
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[api] listening on http://127.0.0.1:${PORT}`);
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

export { app, db };

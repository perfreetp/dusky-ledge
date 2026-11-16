import type {
  GradeResult,
  PlanDoc,
  PlanRecord,
  Submission,
  TeacherReview,
  TrainingTask,
  VersionRecord,
  Workshop,
} from '@shared/types';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  health: () => req<{ ok: boolean }>('/health'),

  workshops: () => req<Workshop[]>('/workshops'),
  createWorkshop: (input: { name: string; code?: string; description?: string; id?: string }) =>
    req<Workshop>('/workshops', { method: 'POST', body: JSON.stringify(input) }),
  deleteWorkshop: (id: string) => req('/workshops/' + id, { method: 'DELETE' }),

  plans: (workshopId?: string | null) =>
    req<PlanRecord[]>(`/plans${workshopId ? `?workshopId=${encodeURIComponent(workshopId)}` : ''}`),
  plan: (id: string) => req<PlanRecord>('/plans/' + id),
  savePlan: (input: {
    id?: string | null;
    name: string;
    workshopId: string | null;
    doc: PlanDoc;
    createVersion?: boolean;
    versionName?: string;
    versionNote?: string;
    author?: string;
  }) => req<PlanRecord>('/plans', { method: 'POST', body: JSON.stringify(input) }),
  deletePlan: (id: string) => req('/plans/' + id, { method: 'DELETE' }),

  versions: (planId: string) => req<VersionRecord[]>(`/plans/${planId}/versions`),
  createVersion: (planId: string, input: { name: string; note?: string; author?: string; doc?: PlanDoc }) =>
    req<VersionRecord>(`/plans/${planId}/versions`, { method: 'POST', body: JSON.stringify(input) }),
  deleteVersion: (planId: string, versionId: string) =>
    req(`/plans/${planId}/versions/${versionId}`, { method: 'DELETE' }),

  tasks: (role?: 'teacher') => req<TrainingTask[]>(`/tasks${role ? `?role=${role}` : ''}`),
  task: (id: string, role?: 'teacher') => req<TrainingTask>(`/tasks/${id}${role ? `?role=${role}` : ''}`),
  saveTask: (input: Partial<TrainingTask> & { title: string; baseDoc: PlanDoc; requirements: TrainingTask['requirements'] }) =>
    req<TrainingTask>('/tasks', { method: 'POST', body: JSON.stringify(input) }),
  publishTask: (id: string, published: boolean) =>
    req<TrainingTask>(`/tasks/${id}/publish`, { method: 'POST', body: JSON.stringify({ published }) }),
  deleteTask: (id: string) => req(`/tasks/${id}`, { method: 'DELETE' }),

  submissions: (taskId?: string) => req<Submission[]>(`/submissions${taskId ? `?taskId=${taskId}` : ''}`),
  submission: (id: string) => req<Submission>('/submissions/' + id),
  submit: (input: { id?: string | null; taskId: string; studentName: string; doc: PlanDoc; submit?: boolean }) =>
    req<Submission>('/submissions', { method: 'POST', body: JSON.stringify(input) }),
  review: (id: string, review: Partial<TeacherReview> & { adjustedItems?: TeacherReview['adjustedItems'] }) =>
    req<Submission>(`/submissions/${id}/review`, { method: 'POST', body: JSON.stringify(review) }),
  deleteSubmission: (id: string) => req(`/submissions/${id}`, { method: 'DELETE' }),

  summary: (taskId: string) =>
    req<{
      task: { id: string; title: string };
      counts: { total: number; submitted: number; reviewed: number; pass: number };
      stats: { avg: number; max: number; min: number; passRate: number };
      students: {
        id: string;
        studentName: string;
        status: string;
        autoScore: number | null;
        finalScore: number | null;
        submittedAt: string | null;
        wrongCount: number;
        topWrong: string[];
      }[];
      wrongList: { title: string; type: string; count: number }[];
    }>('/tasks/' + taskId + '/summary'),

  uploadAsset: async (file: File): Promise<{ id: string; url: string }> => {
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) },
      body: file,
    });
    if (!res.ok) throw new Error('底图上传失败');
    return res.json();
  },
};

export type { GradeResult };

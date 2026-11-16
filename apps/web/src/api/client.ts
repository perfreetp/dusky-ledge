import type {
  AuthResponse,
  ProjectDto,
  ProjectVersionDto,
  ReviewRecordDto,
  UserDto,
} from '@pg/shared';

const BASE = '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  return localStorage.getItem('pg-token');
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem('pg-token', token);
  else localStorage.removeItem('pg-token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    if (!location.pathname.endsWith('/login')) location.assign('/login');
  }
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = body?.message ? String(body.message) : `请求失败 (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return body as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  listProjects: () => request<ProjectDto[]>('/projects'),
  createProject: (data: { name: string; code: string; robotConfigId: string; rules: unknown }) =>
    request<ProjectDto>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  projectDetail: (id: string) => request<ProjectDto>(`/projects/${id}`),
  listVersions: (id: string) => request<ProjectVersionDto[]>(`/projects/${id}/versions`),
  getVersion: (id: string, version: number) =>
    request<ProjectVersionDto>(`/projects/${id}/versions/${version}`),
  saveVersion: (id: string, model: unknown, changeNote: string) =>
    request<ProjectVersionDto>(`/projects/${id}/versions`, {
      method: 'POST',
      body: JSON.stringify({ model, changeNote }),
    }),
  diff: (id: string, from: number, to: number) =>
    request<unknown>(`/projects/${id}/diff?from=${from}&to=${to}`),
  listRobots: () => request<{ id: string; code: string; name: string; config: unknown }[]>('/robots'),
  inspect: (model: unknown, robotConfig: unknown) =>
    request<unknown>('/inspection', {
      method: 'POST',
      body: JSON.stringify({ model, robotConfig }),
    }),
  reviewQueue: () => request<unknown[]>('/reviews/queue'),
  submitReview: (id: string) =>
    request<{ status: string }>(`/reviews/${id}/submit`, { method: 'POST', body: '{}' }),
  approve: (id: string, comment: string) =>
    request<ReviewRecordDto>(`/reviews/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  reject: (id: string, comment: string) =>
    request<ReviewRecordDto>(`/reviews/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  reviewRecords: (id: string) => request<ReviewRecordDto[]>(`/reviews/${id}/records`),
  statsOverview: () => request<unknown[]>('/stats/overview'),
  segmentStats: (id: string) => request<unknown[]>(`/stats/projects/${id}/segments`),
  statsSummary: () => request<unknown[]>('/stats/summary'),
};

export type { UserDto };

// ===== 全局状态中心：订阅式 Store，所有写操作自动持久化 =====
import { loadState, saveState } from './db';
import type {
  DBShape, Order, Project, User, Role, OrderStatus,
  AnimationVersion, Clip, Difficulty
} from './types';
import { uid } from './math';

type Listener = () => void;

class EditorStore {
  state!: DBShape;
  private listeners = new Set<Listener>();
  private saveTimer: number | null = null;
  private saveError = false;

  async init() {
    this.state = await loadState();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
    this.persist();
  }

  private persist() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(async () => {
      await saveState(this.state);
      this.saveError = false;
    }, 250);
  }

  async flush() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    await saveState(this.state);
  }

  // ----- 用户 -----
  get currentUser(): User | null {
    return this.state.users.find((u) => u.id === this.state.currentUserId) ?? null;
  }

  users(role?: Role): User[] {
    return role ? this.state.users.filter((u) => u.role === role) : this.state.users;
  }

  switchUser(id: string) {
    this.state.currentUserId = id;
    this.emit();
  }

  // ----- 订单 -----
  createOrder(title: string, points: string, difficulty: Difficulty): Order {
    const now = Date.now();
    const order: Order = {
      id: uid('ord'), title, points, difficulty,
      status: 'draft', creatorId: this.state.currentUserId!,
      assigneeId: null, projectId: null,
      reworkCount: 0, rejectReason: '',
      createdAt: now, updatedAt: now
    };
    this.state.orders.unshift(order);
    this.emit();
    return order;
  }

  updateOrder(id: string, patch: Partial<Order>) {
    const o = this.state.orders.find((x) => x.id === id);
    if (!o) return;
    Object.assign(o, patch, { updatedAt: Date.now() });
    this.emit();
  }

  setOrderStatus(id: string, status: OrderStatus, extra: Partial<Order> = {}) {
    this.updateOrder(id, { status, ...extra });
  }

  assignOrder(orderId: string, assigneeId: string, projectId: string) {
    this.updateOrder(orderId, { assigneeId, projectId, status: 'assigned', rejectReason: '' });
    const p = this.state.projects.find((x) => x.id === projectId);
    if (p) p.orderId = orderId;
    this.emit();
  }

  rejectOrder(id: string, reason: string) {
    const o = this.state.orders.find((x) => x.id === id);
    if (!o) return;
    o.status = 'rejected';
    o.rejectReason = reason;
    o.reworkCount += 1;
    o.updatedAt = Date.now();
    this.emit();
  }

  approveOrder(id: string) {
    this.setOrderStatus(id, 'approved', { rejectReason: '' });
  }

  orders(): Order[] {
    return this.state.orders;
  }

  deleteOrder(id: string) {
    this.state.orders = this.state.orders.filter((o) => o.id !== id);
    this.emit();
  }

  // ----- 项目 -----
  projects(): Project[] {
    return this.state.projects;
  }

  getProject(id: string): Project | undefined {
    return this.state.projects.find((p) => p.id === id);
  }

  saveProject(project: Project) {
    project.updatedAt = Date.now();
    const idx = this.state.projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) this.state.projects[idx] = project;
    else this.state.projects.unshift(project);
    this.emit();
  }

  deleteProject(id: string) {
    this.state.projects = this.state.projects.filter((p) => p.id !== id);
    this.emit();
  }

  // ----- 动作版本 -----
  addVersion(projectId: string, version: AnimationVersion) {
    const p = this.getProject(projectId);
    if (!p) return;
    p.versions.push(version);
    p.activeVersionId = version.id;
    this.saveProject(p);
  }

  setActiveVersion(projectId: string, versionId: string) {
    const p = this.getProject(projectId);
    if (!p) return;
    p.activeVersionId = versionId;
    this.saveProject(p);
  }

  activeClip(project: Project): Clip | null {
    const v = project.versions.find((x) => x.id === project.activeVersionId);
    return v ? v.clip : null;
  }
}

export const store = new EditorStore();

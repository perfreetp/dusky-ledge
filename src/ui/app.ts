import { BaseElement, define } from './base';
import { h, clear, fmt, pct, download } from './dom';
import { modal } from './modal';
import { toast } from './toast';
import { EditorModel } from '../state/editor';
import { getStore, updateStore, reloadStore } from '../state/store';
import { deadlineState, formatDeadline, type Assignment } from '../state/assignment';
import type { VoxelViewport } from './viewport';
import type { LayerPanel } from './layerPanel';
import type { FaceMeter } from './faceMeter';
import type { SoilPalette } from './soilPalette';
import type { EditorToolbar } from './toolbar';
import type { GradePreview } from './gradePreview';
import type { TaskPanel } from './taskPanel';
import type { DashboardView } from './dashboard';
import type { TeacherView } from './teacher';
import { openSubmitDialog } from './submitDialog';
import { decimateToBudget } from '../core/simplify';
import { meshToObj, meshToMtl } from '../core/exportObj';
import { MATERIALS } from '../core/materials';

const CSS = `
:host { display: block; height: 100%; }
.shell { display: flex; flex-direction: column; height: 100%; background: #121417; }
.topbar {
  display: flex; align-items: center; gap: 12px; padding: 0 14px; height: 48px; flex: 0 0 auto;
  background: #171a1f; border-bottom: 1px solid #262a31;
}
.brand { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; letter-spacing: .2px; }
.logo { width: 22px; height: 22px; border-radius: 5px; background: linear-gradient(160deg,#c99a4e,#7d5a26);
  display: grid; place-items: center; font-size: 11px; color: #17191d; font-weight: 800; }
.brand small { font-size: 10px; font-weight: 400; color: var(--fg-faint); margin-left: 2px; }
.nav { display: flex; gap: 3px; margin-left: 8px; }
.nav button { padding: 5px 12px; border-radius: 7px; background: transparent; border: 1px solid transparent; font-size: 12px; }
.nav button.on { background: #22262d; border-color: #333a43; color: #f0d6a6; }
.nav button:hover:not(.on) { background: #1c2026; }
.topbar .spacer { flex: 1 1 auto; }
.topbar .who { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--fg-dim); }
.topbar .who input { width: 92px; padding: 4px 7px; font-size: 11.5px; }
.main { flex: 1 1 auto; min-height: 0; display: flex; }
.editor { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; min-height: 0; }
.toolbar-wrap { padding: 8px 12px; border-bottom: 1px solid #24282f; background: #14171b; flex: 0 0 auto; }
.workspace { flex: 1 1 auto; min-height: 0; display: flex; }
.stage { flex: 1 1 auto; min-width: 0; position: relative; }
.side { width: 286px; flex: 0 0 286px; border-left: 1px solid #24282f; background: #14171b;
  display: flex; flex-direction: column; min-height: 0; }
.side-inner { overflow-y: auto; padding: 11px 12px 18px; display: flex; flex-direction: column; gap: 13px; }
.sec-title { font-size: 10.5px; text-transform: none; letter-spacing: .4px; color: var(--fg-faint);
  display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px; }
.sec-title .acts { display: flex; gap: 4px; }
.mini-btn { padding: 2px 7px; font-size: 10px; border-radius: 4px; }
.view-btns { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
.view-btns button { padding: 5px 0; font-size: 10.5px; }
.bottom-actions { display: flex; flex-direction: column; gap: 6px; }
.submitted-banner {
  display: flex; align-items: center; gap: 9px; padding: 9px 12px; border-radius: 7px;
  background: #1a2419; border: 1px solid #324a2c; font-size: 11.5px; color: #b6dfa2;
}
.pages { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
.empty-stage { flex: 1 1 auto; display: grid; place-content: center; text-align: center; gap: 12px; padding: 40px; }
.empty-stage h2 { font-size: 16px; margin: 0; }
.empty-stage p { font-size: 12px; color: var(--fg-dim); margin: 0; max-width: 420px; line-height: 1.7; }
@media (max-width: 1080px) { .side { width: 250px; flex-basis: 250px; } }
.side-toggle {
  display: none; position: absolute; right: 12px; top: 12px; z-index: 30;
  padding: 5px 10px; font-size: 14px; line-height: 1;
  background: rgba(23,26,31,.9); border: 1px solid #333a43; backdrop-filter: blur(6px);
}
.side-toggle.shift { right: 262px; }
@media (max-width: 860px) {
  .workspace { position: relative; }
  .side { position: absolute; right: 0; top: 0; bottom: 0; z-index: 20; width: 260px; flex-basis: 260px;
    box-shadow: -8px 0 24px rgba(0,0,0,.5); }
  .side.hide { display: none; }
  .side-toggle { display: block; }
  .side-toggle.shift { right: 272px; }}
`;

type Mode = 'student' | 'teacher' | 'dashboard';

export class AppShell extends BaseElement {
  private model = new EditorModel({ dims: { nx: 12, ny: 12, nz: 12 }, layerRows: [3, 3, 3, 3] });
  private mode: Mode = 'student';
  private viewport: VoxelViewport | null = null;
  private layerPanel: LayerPanel | null = null;
  private faceMeter: FaceMeter | null = null;
  private palette: SoilPalette | null = null;
  private toolbar: EditorToolbar | null = null;
  private gradePreview: GradePreview | null = null;
  private taskPanel: TaskPanel | null = null;
  private navBtns: HTMLButtonElement[] = [];
  private mainEl!: HTMLElement;
  private whoInput!: HTMLInputElement;
  private lastSubmitted: string | null = null;

  protected render(): void {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.root.append(style);
    this.paintShell();
    this.boot();
  }

  private paintShell(): void {
    this.navBtns = [];
    const nav = h('div', { class: 'nav' });
    for (const [id, label] of [['student', '学员建模'], ['teacher', '教师出题'], ['dashboard', '教学看板']] as Array<[Mode, string]>) {
      const btn = h('button', {
        class: this.mode === id ? 'on' : '',
        'data-mode': id,
        onclick: () => this.setMode(id),
      }, label) as HTMLButtonElement;
      this.navBtns.push(btn);
      nav.append(btn);
    }
    this.whoInput = h('input', {
      type: 'text', placeholder: '姓名/学号', title: '当前学员署名', value: this.model.student,
      oninput: () => {
        this.model.student = this.whoInput.value;
      },
    }) as HTMLInputElement;
    this.mainEl = h('div', { class: 'main' });
    const shell = h('div', { class: 'shell' },
      h('div', { class: 'topbar' },
        h('div', { class: 'brand' },
          h('span', { class: 'logo' }, '地'),
          h('span', {}, '体素地层实验室', h('small', {}, 'voxel strata lab')),
        ),
        nav,
        h('div', { class: 'spacer' }),
        h('div', { class: 'who' }, h('span', {}, '署名'), this.whoInput),
      ),
      this.mainEl,
    );
    this.root.append(shell);
    this.renderMode();
  }

  private boot(): void {
    // 若存在题目，默认加载第一道进行中的题
    const store = getStore();
    const open = store.assignments.find((a) => a.status === 'open') ?? store.assignments[0];
    const draft = EditorModel.readDraft();
    if (open) {
      this.model.loadProject(
        { dims: { nx: open.nx, ny: open.ny, nz: open.nz }, layerRows: open.layerRows },
        open,
        this.model.student,
      );
      if (draft && draft.assignmentId === open.id && EditorModel.draftMatches(draft, open)) {
        try {
          this.model.loadSerialized(draft.data, draft.rows, open);
          this.model.student = draft.student || this.model.student;
          this.whoInput.value = this.model.student;
          toast('已恢复上次的建模草稿', 'info');
        } catch {
          /* 草稿损坏则忽略 */
        }
      }
    } else if (draft && !open) {
      // 自由练习没有题目约束，草稿直接恢复
      try {
        this.model.loadSerialized(draft.data, draft.rows, null);
        this.model.student = draft.student || '';
        this.whoInput.value = this.model.student;
      } catch {
        /* ignore */
      }
    }
  }

  private setMode(mode: Mode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    for (const b of this.navBtns) b.classList.toggle('on', b.dataset.mode === mode);
    this.renderMode();
  }

  private renderMode(): void {
    clear(this.mainEl);
    if (this.mode === 'student') this.renderStudent();
    else if (this.mode === 'teacher') this.renderTeacher();
    else this.renderDashboard();
  }

  private renderStudent(): void {
    const stage = h('div', { class: 'stage' });
    const viewport = document.createElement('voxel-viewport') as VoxelViewport;
    stage.append(viewport);
    this.viewport = viewport;

    const toolbar = document.createElement('editor-toolbar') as EditorToolbar;
    const palette = document.createElement('soil-palette') as SoilPalette;
    const layers = document.createElement('layer-panel') as LayerPanel;
    const faceMeter = document.createElement('face-meter') as FaceMeter;
    const grade = document.createElement('grade-preview') as GradePreview;
    const task = document.createElement('task-panel') as TaskPanel;
    this.toolbar = toolbar;
    this.palette = palette;
    this.layerPanel = layers;
    this.faceMeter = faceMeter;
    this.gradePreview = grade;
    this.taskPanel = task;

    const viewBtns = h('div', { class: 'view-btns' },
      h('button', { onclick: () => viewport.setView('iso') }, '等轴'),
      h('button', { onclick: () => viewport.setView('front') }, '正视'),
      h('button', { onclick: () => viewport.setView('top') }, '俯视'),
      h('button', { onclick: () => viewport.setView('side') }, '侧视'),
    );

    const submitBtn = h('button', { class: 'primary', onclick: () => this.doSubmit() }, '提交作业');

    const sideInner = h('div', { class: 'side-inner' },
      task,
      h('div', {},
        h('div', { class: 'sec-title' }, h('span', {}, '当前项目'), h('span', { class: 'acts' },
          h('button', {
            class: 'mini-btn ghost',
            title: '换一道题 / 新建自由练习',
            onclick: () => this.openProjectPicker(),
          }, '切换'),
        )),
      ),
      h('div', {},
        h('div', { class: 'sec-title' }, '土色'),
        palette,
      ),
      h('div', {},
        h('div', { class: 'sec-title' },
          h('span', {}, '地层'),
          h('span', { class: 'acts' },
            h('button', {
              class: 'mini-btn ghost',
              title: '显示全部层',
              onclick: () => this.model.showAllLayers(),
            }, '全部'),
            h('button', {
              class: 'mini-btn ghost danger',
              title: '清空当前层',
              onclick: () => this.confirmClearLayer(),
            }, '清层'),
          ),
        ),
        layers,
      ),
      h('div', {},
        h('div', { class: 'sec-title' }, '视图'),
        viewBtns,
      ),
      h('div', {},
        h('div', { class: 'sec-title' }, '面数与导出'),
        faceMeter,
      ),
      grade,
      h('div', { class: 'bottom-actions' },
        submitBtn,
        h('button', { class: 'ghost', onclick: () => this.saveDraft(true) }, '保存草稿'),
        h('button', { class: 'ghost', onclick: () => this.openReplaceDialog() }, '整片替换土色'),
      ),
    );

    const side = h('div', { class: 'side' }, sideInner);
    // 窄屏下右侧面板默认收起，避免遮挡画布
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches) {
      side.classList.add('hide');
    }
    const sideToggle = h('button', {
      class: 'side-toggle',
      title: '展开/收起右侧面板',
      onclick: () => {
        const hidden = side.classList.toggle('hide');
        sideToggle.classList.toggle('shift', !hidden);
      },
    }, '≡');
    if (side.classList.contains('hide')) sideToggle.classList.remove('shift');
    const workspace = h('div', { class: 'workspace' }, stage, side, sideToggle);
    const editor = h('div', { class: 'editor' },
      h('div', { class: 'toolbar-wrap' }, toolbar),
      workspace,
    );
    this.mainEl.append(editor);

    viewport.attach(this.model);
    toolbar.attach(this.model, {
      pasteToLayer: (layer, copy) => this.pasteToLayer(layer, copy),
      clearSelection: () => this.model.setSelection(null),
    });
    palette.attach(this.model);
    layers.attach(this.model);
    faceMeter.attach(this.model, {
      onDecimate: () => this.doDecimate(),
      onExport: () => this.doExport(),
    });
    grade.attach(this.model);
    task.attach(this.model);

    viewport.addEventListener('render-stats', (e) => {
      const d = (e as CustomEvent).detail;
      faceMeter.setRenderInfo({ drawCalls: d.drawCalls, voxels: this.model.filledCount });
    });
    this.bindHotkeys();
  }

  private renderTeacher(): void {
    reloadStore();
    const view = document.createElement('teacher-view') as TeacherView;
    this.mainEl.append(h('div', { class: 'pages' }, view));
  }

  private renderDashboard(): void {
    reloadStore();
    const view = document.createElement('dashboard-view') as DashboardView;
    this.mainEl.append(h('div', { class: 'pages' }, view));
  }

  // ── 操作 ──
  private bindHotkeys(): void {
    const handler = (e: KeyboardEvent) => {
      if (this.mode !== 'student') return;
      const target = e.composedPath()[0] as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.model.redo();
        else this.model.undo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.model.redo();
        return;
      }
      if (meta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.saveDraft(true);
        return;
      }
      if (meta && e.key.toLowerCase() === 'c' && this.model.selection) {
        e.preventDefault();
        const n = this.model.copySelection();
        toast(`已复制 ${n} 个体素`, 'ok');
        return;
      }
      if (meta && e.key.toLowerCase() === 'v' && this.model.selection) {
        e.preventDefault();
        this.pasteToLayer(this.model.currentLayerIndex, true);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.model.selection) {
          e.preventDefault();
          const n = this.model.clearSelection();
          toast(`已清除选区内 ${n} 个体素`, 'ok');
        }
        return;
      }
      if (e.key === 'Escape') {
        this.model.setSelection(null);
        return;
      }
      const map: Record<string, () => void> = {
        b: () => this.model.setTool('place'),
        e: () => this.model.setTool('erase'),
        h: () => this.model.setTool('hide'),
        r: () => this.model.setTool('select'),
        i: () => this.model.setTool('eyedrop'),
        v: () => this.model.setTool('orbit'),
        m: () => this.model.toggleMirror(),
      };
      const fn = map[e.key.toLowerCase()];
      if (fn) {
        e.preventDefault();
        fn();
        return;
      }
      if (/^[1-8]$/.test(e.key)) {
        this.model.setMaterial(Number(e.key));
      }
      if (e.key === '[') this.model.setCurrentLayer(this.model.currentLayerIndex - 1);
      if (e.key === ']') this.model.setCurrentLayer(this.model.currentLayerIndex + 1);
    };
    window.addEventListener('keydown', handler);
    this.registerCleanup(() => window.removeEventListener('keydown', handler));
  }

  private cleanups: Array<() => void> = [];
  private registerCleanup(fn: () => void): void {
    this.cleanups.push(fn);
  }

  override disconnectedCallback(): void {
    for (const fn of this.cleanups) fn();
    this.cleanups = [];
    super.disconnectedCallback();
  }

  private pasteToLayer(layer: number, copy: boolean): void {
    const r = this.model.pasteToLayer(layer, copy);
    if (!r.moved) {
      toast('选区为空，没有可移动的体素', 'warn');
      return;
    }
    const extra = r.skipped ? `，${r.skipped} 行超出目标层被跳过` : '';
    toast(`${copy ? '已复制' : '已平移'} ${r.moved} 个体素到第 ${layer + 1} 层${extra}`, extra ? 'warn' : 'ok');
  }

  private saveDraft(notify: boolean): void {
    this.model.student = this.whoInput?.value ?? this.model.student;
    this.model.saveDraft();
    if (notify) toast('草稿已保存到本机', 'ok');
  }

  private confirmClearLayer(): void {
    const layer = this.model.currentLayer;
    const filled = (() => {
      let n = 0;
      for (let y = layer.start; y < layer.start + layer.rows; y++)
        for (let z = 0; z < this.model.dims.nz; z++)
          for (let x = 0; x < this.model.dims.nx; x++)
            if (this.model.grid.materialAt(x, y, z)) n++;
      return n;
    })();
    if (!filled) {
      toast('当前层没有体素', 'info');
      return;
    }
    const content = h('div', {},
      h('p', { style: 'font-size:12.5px;line-height:1.7' }, `清空第 ${layer.index + 1} 层共 ${fmt(filled)} 个体素？可撤销。`),
      h('div', { style: 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px' },
        h('button', { onclick: () => modal.close() }, '取消'),
        h('button', {
          class: 'primary',
          onclick: () => {
            const n = this.model.clearLayer();
            modal.close();
            toast(`已清空 ${fmt(n)} 个体素`, 'ok');
          },
        }, '清空'),
      ),
    );
    modal.open('清空当前层', content);
  }

  private openReplaceDialog(): void {
    const from = h('select', {}) as HTMLSelectElement;
    const to = h('select', {}) as HTMLSelectElement;
    for (const m of MATERIALS) {
      from.append(h('option', { value: String(m.id) }, `${m.id} · ${m.name}`));
      to.append(h('option', { value: String(m.id) }, `${m.id} · ${m.name}`));
    }
    const hovered = this.model.hover;
    const hoverMat = hovered ? this.model.grid.materialAt(hovered.x, hovered.y, hovered.z) : 0;
    from.value = String(hoverMat || 1);
    to.value = String(this.model.material);
    const scope = h('input', { type: 'checkbox' }) as HTMLInputElement;
    scope.disabled = !this.model.selection;
    const counts = this.model.grid.countsByMaterial();
    const content = h('div', { style: 'display:flex;flex-direction:column;gap:12px' },
      h('p', { class: 'hintline', style: 'margin:0' },
        '把整个探方内某一种土色整片替换为另一种。若已框选，可勾选只替换选区内。'),
      h('div', { style: 'display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:end' },
        h('div', { style: 'display:flex;flex-direction:column;gap:4px' }, h('label', {}, '原土色'), from),
        h('div', { style: 'padding-bottom:7px;color:var(--fg-faint)' }, '→'),
        h('div', { style: 'display:flex;flex-direction:column;gap:4px' }, h('label', {}, '替换为'), to),
      ),
      h('div', { class: 'tiny faint', style: 'font-family:var(--mono)' },
        MATERIALS.map((m) => `${m.short} ${fmt(counts[m.id] ?? 0)}`).join('  ·  ')),
      h('label', { style: 'display:flex;gap:6px;align-items:center' }, scope, '仅替换框选范围内'),
      h('div', { style: 'display:flex;justify-content:flex-end;gap:8px' },
        h('button', { onclick: () => modal.close() }, '取消'),
        h('button', {
          class: 'primary',
          onclick: () => {
            const n = this.model.replaceAll(Number(from.value), Number(to.value), scope.checked ? this.model.selection : null);
            modal.close();
            toast(n ? `已替换 ${fmt(n)} 个体素` : '没有找到该土色', n ? 'ok' : 'warn');
          },
        }, '执行替换'),
      ),
    );
    modal.open('整片替换土色', content);
  }

  private doDecimate(): void {
    const before = this.model.mesh.triCount;
    const budget = this.model.faceBudget;
    if (budget <= 0) {
      toast('未设置面数预算，无需减面', 'info');
      return;
    }
    const result = decimateToBudget(this.model.grid, budget);
    if (result.factor === 1) {
      toast('当前面数已在预算内', 'ok');
      return;
    }
    const content = h('div', {},
      h('p', { style: 'font-size:12.5px;line-height:1.7' },
        `把 ${result.factor}×${result.factor}×${result.factor} 的体素块合并为一个粗体素后，三角面数从 `,
        h('b', {}, fmt(before)), ' 降到 ', h('b', {}, fmt(result.trianglesAfter)),
        `（预算 ${fmt(budget)}）。面数越低，地层边界越粗糙。`),
      !result.achieved
        ? h('p', { class: 'warn', style: 'font-size:12px' }, '即使使用最粗的级别仍超出预算，导出的模型会保留此级别。')
        : null,
      h('p', { class: 'hintline', style: 'margin:0' }, '减面只影响导出的 OBJ，不改变当前体素模型，可继续编辑。'),
      h('div', { style: 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px' },
        h('button', { onclick: () => modal.close() }, '取消'),
        h('button', {
          class: 'primary',
          onclick: () => {
            modal.close();
            const name = (this.model.assignment?.title ?? '地层模型').replace(/[\\/:*?"<>|]/g, '_');
            const text = meshToObj(result.mesh, result.grid.dims, { scale: result.factor });
            download(`${name}_减面x${result.factor}.obj`, text, 'model/obj');
            download(`${name}_减面x${result.factor}.mtl`, meshToMtl(result.mesh), 'model/mtl');
            toast(`已导出减面模型：${fmt(result.trianglesAfter)} 面`, 'ok');
          },
        }, '减面并导出 OBJ'),
      ),
    );
    modal.open('减面处理', content);
  }

  private doExport(): void {
    const tris = this.model.mesh.triCount;
    const budget = this.model.faceBudget;
    const over = budget > 0 && tris > budget;
    if (over) {
      const content = h('div', {},
        h('p', { style: 'font-size:12.5px;line-height:1.7' },
          `当前 ${fmt(tris)} 面，超出预算 ${fmt(budget)} 面。导出前建议先减面。`),
        h('div', { style: 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px' },
          h('button', { onclick: () => modal.close() }, '取消'),
          h('button', {
            onclick: () => {
              modal.close();
              this.exportRaw();
            },
          }, '仍然导出原模型'),
          h('button', {
            class: 'primary',
            onclick: () => {
              modal.close();
              this.doDecimate();
            },
          }, '先减面'),
        ),
      );
      modal.open('三角面数超预算', content);
      return;
    }
    this.exportRaw();
  }

  private exportRaw(): void {
    const name = (this.model.assignment?.title ?? '地层模型').replace(/[\\/:*?"<>|]/g, '_');
    const obj = this.model.buildObj(false);
    download(`${name}.obj`, obj.obj, 'model/obj');
    download(`${name}.mtl`, obj.mtl, 'model/mtl');
    toast(`已导出 ${fmt(obj.triangles)} 面的 OBJ`, 'ok');
  }

  private doSubmit(): void {
    const store = getStore();
    const a = this.model.assignment;
    if (!a) {
      toast('当前是自由练习模式，请先在“切换”里选择一道题目', 'warn');
      return;
    }
    const state = deadlineState(a);
    if (a.status === 'closed') {
      toast('该题已关闭收题', 'warn');
      return;
    }
    if (state === 'closed' && !a.allowLate) {
      toast('已过截止时间且不允许迟交', 'error');
      return;
    }
    const proceed = () => {
      openSubmitDialog(this.model, a, (sub) => {
        updateStore((s) => {
          s.submissions.push(sub);
        });
        this.lastSubmitted = sub.id;
        this.model.saveDraft();
        toast(`提交成功 · 自动评分 ${sub.autoScore.toFixed(1)} / ${sub.autoMax}`, 'ok');
      });
    };
    if (state === 'late') {
      const content = h('div', {},
        h('p', { style: 'font-size:12.5px;line-height:1.7' },
          `已超过截止时间 ${formatDeadline(a.dueAt)}，本次提交会标记为迟交。仍要提交吗？`),
        h('div', { style: 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px' },
          h('button', { onclick: () => modal.close() }, '取消'),
          h('button', { class: 'primary', onclick: () => { modal.close(); proceed(); } }, '仍要提交'),
        ),
      );
      modal.open('迟交提醒', content);
      return;
    }
    proceed();
  }

  private openProjectPicker(): void {
    reloadStore();
    const store = getStore();
    const list = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    for (const a of store.assignments) {
      const due = deadlineState(a);
      list.append(
        h('div', {
          style: 'display:flex;gap:10px;align-items:center;padding:10px 12px;background:#16191d;border:1px solid #2a2f37;border-radius:8px',
        },
          h('div', { style: 'flex:1 1 auto;min-width:0' },
            h('div', { class: 'strong' }, a.title),
            h('div', { class: 'tiny faint' },
              `${a.nx}×${a.nz} 格 · ${a.layerRows.length} 层 · 截止 ${formatDeadline(a.dueAt)}`),
          ),
          a.status === 'closed' || (due === 'closed' && !a.allowLate)
            ? h('span', { class: 'tag bad' }, '已停止')
            : due === 'late'
              ? h('span', { class: 'tag warn' }, '迟交期')
              : h('span', { class: 'tag ok' }, '进行中'),
          h('button', {
            class: 'primary',
            onclick: () => {
              this.loadAssignmentIntoEditor(a);
              modal.close();
              toast(`已切换到「${a.title}」`, 'ok');
            },
          }, '开始'),
        ),
      );
    }
    if (!store.assignments.length) {
      list.append(h('div', { class: 'hintline' }, '还没有题目，可直接开始自由练习。'));
    }
    const content = h('div', {},
      list,
      h('div', { style: 'margin-top:14px;display:flex;justify-content:space-between;gap:8px' },
        h('button', {
          onclick: () => {
            this.model.loadProject({ dims: { nx: 12, ny: 12, nz: 12 }, layerRows: [3, 3, 3, 3] }, null, this.model.student);
            modal.close();
            this.remountEditor();
            toast('已进入自由练习模式', 'ok');
          },
        }, '自由练习（12×12×12，4 层）'),
        h('button', { onclick: () => modal.close() }, '取消'),
      ),
    );
    modal.open('选择题目', content, { wide: true });
  }

  /** 载入题目（含该题草稿），并按新尺寸重建左右面板 */
  private loadAssignmentIntoEditor(a: Assignment): void {
    this.model.loadProject({ dims: { nx: a.nx, ny: a.ny, nz: a.nz }, layerRows: a.layerRows }, a, this.model.student);
    const draft = EditorModel.readDraft();
    if (draft && draft.assignmentId === a.id && EditorModel.draftMatches(draft, a)) {
      try {
        this.model.loadSerialized(draft.data, draft.rows, a);
        this.model.student = draft.student || this.model.student;
        if (this.whoInput) this.whoInput.value = this.model.student;
      } catch {
        /* 草稿损坏则忽略 */
      }
    }
    this.remountEditor();
  }

  /** 尺寸/层数变化后重建编辑器界面（viewport 需要重新 frame） */
  private remountEditor(): void {
    if (this.mode !== 'student') return;
    this.renderMode();
  }
}

define('app-shell', AppShell);

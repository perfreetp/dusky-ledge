import { BaseElement, define } from './base';
import { h, clear, fmt, pct } from './dom';
import { modal } from './modal';
import { toast } from './toast';
import { getStore } from '../state/store';
import type { EditorModel } from '../state/editor';
import { countdownText, formatDeadline, deadlineState } from '../state/assignment';
import { layerLabel } from '../core/layers';

const CSS = `
:host { display: block; }
.timer { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 7px;
  background: #16191d; border: 1px solid var(--border-soft); font-size: 11px; }
.timer.expired { border-color: #5c2f39; background: #1c1215; }
.timer.late { border-color: #5a4526; background: #1c1710; }
.timer .cd { font-family: var(--mono); font-size: 12px; font-weight: 600; }
.timer .lbl { color: var(--fg-faint); }
.progress { display: flex; flex-direction: column; gap: 5px; padding: 8px 10px; border-radius: 7px;
  background: #101216; border: 1px solid var(--border-soft); }
.progress-head { display: flex; justify-content: space-between; font-size: 11px; }
.pbar { height: 5px; border-radius: 3px; background: #22262d; overflow: hidden; }
.pfill { height: 100%; background: linear-gradient(90deg, #8a6a34, #d7a55a); }
.meta { font-size: 10px; color: var(--fg-faint); font-family: var(--mono); display: flex; justify-content: space-between; }
`;

export class TaskPanel extends BaseElement {
  private model: EditorModel | null = null;
  private unsubscribe: (() => void) | null = null;
  private lastTick = -1;
  private timerEl: HTMLElement | null = null;
  private timerHandle: ReturnType<typeof setInterval> | null = null;

  protected render(): void {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.root.append(style);
  }

  attach(model: EditorModel): void {
    this.unsubscribe?.();
    this.model = model;
    this.unsubscribe = model.subscribe(() => this.sync());
    this.sync(true);
    this.startTimer();
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
    if (this.timerHandle) clearInterval(this.timerHandle);
    this.timerHandle = null;
  }

  private startTimer(): void {
    if (this.timerHandle) clearInterval(this.timerHandle);
    this.timerHandle = setInterval(() => this.paintTimer(), 1000);
  }

  private paintTimer(): void {
    if (!this.model?.assignment || !this.timerEl) return;
    const a = this.model.assignment;
    const cd = countdownText(a.dueAt);
    const state = deadlineState(a);
    this.timerEl.className = `timer ${cd.expired ? (state === 'late' ? 'late' : 'expired') : ''}`;
    clear(this.timerEl);
    this.timerEl.append(
      h('span', { class: 'lbl' }, '截止'),
      h('span', {}, formatDeadline(a.dueAt).slice(5)),
      h('span', { class: 'cd' }, cd.text),
    );
  }

  private sync(force = false): void {
    if (!this.model) return;
    if (!force && this.lastTick === this.model.tick) return;
    this.lastTick = this.model.tick;
    const m = this.model;
    clear(this.root);
    const style = document.createElement('style');
    style.textContent = CSS;
    this.root.append(style);

    const a = m.assignment;
    if (a) {
      this.timerEl = h('div', { class: 'timer' });
      this.root.append(this.timerEl);
      this.paintTimer();
    } else {
      this.timerEl = null;
      this.root.append(
        h('div', { class: 'timer' }, h('span', { class: 'lbl' }, '自由练习模式 · 无截止时间')),
      );
    }

    const filled = m.filledCount;
    const total = m.dims.nx * m.dims.ny * m.dims.nz;
    const builtLayers = m.layers.filter((l, i) => {
      let any = false;
      for (let y = l.start; y < l.start + l.rows && !any; y++)
        for (let z = 0; z < m.dims.nz && !any; z++)
          for (let x = 0; x < m.dims.nx && !any; x++)
            if (m.grid.materialAt(x, y, z)) any = true;
      return any;
    }).length;
    const ratio = total ? filled / total : 0;
    this.root.append(
      h('div', { class: 'progress' },
        h('div', { class: 'progress-head' },
          h('span', { class: 'dim' }, '建模进度'),
          h('span', { class: 'mono' }, `${fmt(filled)} 格`),
        ),
        h('div', { class: 'pbar' }, h('div', { class: 'pfill', style: `width:${(ratio * 100).toFixed(1)}%` })),
        h('div', { class: 'meta' },
          h('span', {}, `已建 ${builtLayers} / ${m.layers.length} 层`),
          h('span', {}, `体积 ${pct(ratio, 1)}`),
        ),
      ),
    );
  }
}

define('task-panel', TaskPanel);

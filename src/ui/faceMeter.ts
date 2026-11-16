import { BaseElement, define } from './base';
import { h, clear, fmt, pct } from './dom';
import type { EditorModel } from '../state/editor';

const CSS = `
:host { display: block; }
.meter {
  display: flex; flex-direction: column; gap: 5px;
  padding: 8px 10px; border-radius: 7px; background: #101216; border: 1px solid var(--border-soft);
}
.meter.warn { border-color: #5a4526; background: #1c1710; }
.meter.bad { border-color: #5c2f39; background: #1c1215; }
.line1 { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.tris { font-family: var(--mono); font-size: 19px; font-weight: 600; letter-spacing: -.4px; }
.unit { font-size: 11px; color: var(--fg-dim); font-weight: 400; margin-left: 3px; }
.lbl { font-size: 11px; color: var(--fg-faint); }
.bar { height: 5px; border-radius: 3px; background: #22262d; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg, #4a7a4a, #7fb069); transition: width .2s; }
.meter.warn .fill { background: linear-gradient(90deg, #8a6326, #e0a458); }
.meter.bad .fill { background: linear-gradient(90deg, #7a2f3c, #cf6679); }
.note { font-size: 11px; line-height: 1.5; }
.note.warn { color: #f0cb91; }
.note.bad { color: #f0a8b5; }
.note.ok { color: #a9cd96; }
.actions { display: flex; gap: 6px; margin-top: 2px; }
.actions button { flex: 1 1 0; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; font-size: 11px; }
.kv { display: flex; justify-content: space-between; gap: 6px; }
.kv b { font-family: var(--mono); font-weight: 500; }
`;

export class FaceMeter extends BaseElement {
  private model: EditorModel | null = null;
  private unsubscribe: (() => void) | null = null;
  private lastTick = -1;
  private onDecimate: (() => void) | null = null;
  private onExport: (() => void) | null = null;
  private extra: { drawCalls: number; voxels: number } = { drawCalls: 0, voxels: 0 };

  protected render(): void {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.root.append(style);
    this.paint();
  }

  attach(model: EditorModel, handlers: { onDecimate?: () => void; onExport?: () => void } = {}): void {
    this.unsubscribe?.();
    this.model = model;
    this.onDecimate = handlers.onDecimate ?? null;
    this.onExport = handlers.onExport ?? null;
    this.unsubscribe = model.subscribe(() => this.sync());
    this.sync(true);
  }

  setRenderInfo(info: { drawCalls: number; voxels: number }): void {
    this.extra = info;
    this.sync();
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private sync(force = false): void {
    if (!this.model) return;
    if (!force && this.lastTick === this.model.tick) return;
    this.lastTick = this.model.tick;
    this.paint();
  }

  private lastKey = '';

  private paint(): void {
    if (!this.model) return;
    const m = this.model;
    const tris = m.mesh.triCount;
    const budget = m.faceBudget;
    const over = budget > 0 && tris > budget;
    const ratio = budget > 0 ? Math.min(1.6, tris / budget) : 0;
    const key = `${tris}|${budget}|${m.filledCount}|${this.extra.drawCalls}|${m.hiddenVoxels}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    const level = budget <= 0 ? 'ok' : ratio > 1 ? 'bad' : ratio > 0.85 ? 'warn' : 'ok';
    clear(this.root);
    const style = document.createElement('style');
    style.textContent = CSS;
    this.root.append(style);

    const meter = h('div', { class: `meter ${level}` },
      h('div', { class: 'line1' },
        h('span', { class: 'tris' }, fmt(tris), h('span', { class: 'unit' }, '三角面')),
        h('span', { class: 'lbl' }, budget > 0 ? `预算 ${fmt(budget)}` : '未设预算'),
      ),
      h('div', { class: 'bar' },
        h('div', { class: 'fill', style: `width:${budget > 0 ? Math.min(100, ratio * 100).toFixed(1) : 0}%` }),
      ),
      budget > 0
        ? h('div', { class: `note ${level === 'ok' ? 'ok' : level === 'warn' ? 'warn' : 'bad'}` },
            over
              ? `超出预算 ${fmt(tris - budget)} 面，请减面后再导出`
              : ratio > 0.85
                ? `已用 ${pct(ratio)}，接近预算上限`
                : `余量 ${fmt(budget - tris)} 面`)
        : h('div', { class: 'note ok' }, '当前未设面数预算'),
    );

    const grid2 = h('div', { class: 'grid2' },
      h('div', { class: 'kv' }, h('span', { class: 'dim' }, '体素'), h('b', {}, fmt(m.filledCount))),
      h('div', { class: 'kv' }, h('span', { class: 'dim' }, '绘制批次'), h('b', {}, String(this.extra.drawCalls))),
      h('div', { class: 'kv' }, h('span', { class: 'dim' }, '材质分组'), h('b', {}, String(m.mesh.batches.length))),
      h('div', { class: 'kv' }, h('span', { class: 'dim' }, '隐藏'), h('b', {}, fmt(m.hiddenVoxels))),
    );

    const actions = h('div', { class: 'actions' },
      h('button', {
        class: over ? 'primary' : '',
        title: '按预算把体素块合并为更粗的网格以降低面数',
        onclick: () => this.onDecimate?.(),
      }, '减面'),
      h('button', {
        class: over ? '' : 'primary',
        title: '导出 OBJ（超预算时会先询问是否减面）',
        onclick: () => this.onExport?.(),
      }, '导出 OBJ'),
    );

    this.root.append(meter, grid2, actions);
  }
}

define('face-meter', FaceMeter);

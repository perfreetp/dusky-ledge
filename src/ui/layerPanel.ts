import { BaseElement, define } from './base';
import { h, clear, fmt, pct } from './dom';
import { layerLabel } from '../core/layers';
import type { EditorModel } from '../state/editor';

const CSS = `
:host { display: block; }
.list { display: flex; flex-direction: column; gap: 3px; }
.item {
  display: grid; grid-template-columns: 22px 1fr auto; gap: 7px; align-items: center;
  padding: 5px 7px; border-radius: 6px; border: 1px solid transparent; cursor: pointer;
  background: transparent;
}
.item:hover { background: var(--bg-soft); }
.item.cur { background: var(--bg-soft); border-color: var(--border); }
.item.solo { border-color: var(--accent); background: var(--accent-soft); }
.eye {
  width: 20px; height: 20px; padding: 0; display: grid; place-items: center;
  background: transparent; border: 0; border-radius: 4px; color: var(--fg-dim); font-size: 12px;
}
.eye:hover { background: var(--bg-hover); color: var(--fg); }
.eye.off { color: #5d5a54; }
.mid { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.title { font-size: 12px; display: flex; align-items: center; gap: 6px; }
.bar { height: 3px; border-radius: 2px; background: #22262d; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg, #8a6a34, #d7a55a); border-radius: 2px; }
.meta { font-size: 10px; color: var(--fg-faint); font-family: var(--mono); text-align: right; line-height: 1.35; }
.pos { font-size: 9px; color: #6b6862; }
.empty { font-size: 11px; color: var(--fg-faint); }
.ratio-bad { color: #e6a08e; }
.ratio-ok { color: #9ec48a; }
.hidden-note { font-size: 10px; color: var(--fg-faint); }
`;

export class LayerPanel extends BaseElement {
  private model: EditorModel | null = null;
  private unsubscribe: (() => void) | null = null;
  private listEl!: HTMLElement;
  private lastTick = -1;

  protected render(): void {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.listEl = h('div', { class: 'list' });
    this.root.append(style, this.listEl);
  }

  attach(model: EditorModel): void {
    this.unsubscribe?.();
    this.model = model;
    this.unsubscribe = model.subscribe(() => this.sync());
    this.sync(true);
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  sync(force = false): void {
    if (!this.model) return;
    if (!force && this.lastTick === this.model.tick) return;
    this.lastTick = this.model.tick;
    const m = this.model;
    const stats = m.stats;
    clear(this.listEl);
    if (!m.layers.length) {
      this.listEl.append(h('div', { class: 'empty' }, '题目未定义地层'));
      return;
    }
    // 自上而下展示（第 1 层在最上）
    for (const layer of m.layers) {
      const filled = stats.layerFilled[layer.index] ?? 0;
      const cap = stats.layerCapacity[layer.index] || 1;
      const ratio = filled / cap;
      const visible = m.isLayerVisible(layer.index);
      const solo = m.soloLayer === layer.index;
      const isCur = m.currentLayerIndex === layer.index;
      const eye = h('button', {
        class: `eye ${visible ? '' : 'off'}`,
        title: visible ? '隐藏此层' : '显示此层',
        onclick: (e: Event) => {
          e.stopPropagation();
          m.toggleLayer(layer.index);
        },
      }, visible ? '◉' : '○');
      const item = h('div', {
        class: `item ${isCur ? 'cur' : ''} ${solo ? 'solo' : ''}`,
        'data-layer': String(layer.index),
        title: '点击设为当前层 · 双击只显示此层',
        onclick: () => m.setCurrentLayer(layer.index),
        ondblclick: (e: Event) => {
          e.stopPropagation();
          m.setSoloLayer(layer.index);
        },
      },
        eye,
        h('div', { class: 'mid' },
          h('div', { class: 'title' },
            h('span', {}, layerLabel(layer.index)),
            solo ? h('span', { class: 'tag' }, '单层') : null,
            !visible ? h('span', { class: 'tag bad' }, '隐藏') : null,
          ),
          h('div', { class: 'bar' }, h('div', {
            class: 'fill',
            style: `width:${Math.min(100, ratio * 100).toFixed(1)}%`,
          })),
        ),
        h('div', { class: 'meta' },
          h('div', { class: ratio >= 0.999 ? 'ratio-ok' : ratio > 0 ? '' : 'ratio-bad' },
            ratio >= 0.999 ? '满' : `${Math.round(ratio * 100)}%`),
          h('div', { class: 'pos' }, `y ${layer.start}–${layer.start + layer.rows - 1}`),
        ),
      );
      this.listEl.append(item);
    }
    const hidden = m.hiddenVoxels;
    if (hidden) {
      this.listEl.append(
        h('div', { class: 'hidden-note' },
          `另有 ${fmt(hidden)} 个体素被单独隐藏 · `,
          h('a', {
            href: '#',
            style: 'color:var(--accent)',
            onclick: (e: Event) => {
              e.preventDefault();
              m.restoreHidden();
            },
          }, '全部恢复'),
        ),
      );
    }
  }
}

define('layer-panel', LayerPanel);

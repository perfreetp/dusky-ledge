import { BaseElement, define } from './base';
import { h, clear } from './dom';
import { MATERIALS } from '../core/materials';
import type { EditorModel } from '../state/editor';

const CSS = `
:host { display: block; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.sw {
  position: relative; display: flex; flex-direction: column; gap: 2px; align-items: stretch;
  padding: 0; border-radius: 7px; overflow: hidden; cursor: pointer;
  background: var(--bg-soft); border: 1px solid var(--border);
  transition: transform .1s, border-color .12s;
}
.sw:hover { transform: translateY(-1px); border-color: #454c56; }
.sw.on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
.chip { height: 26px; width: 100%; }
.name { font-size: 10px; color: var(--fg-dim); text-align: center; padding: 2px 0 4px; }
.sw.on .name { color: #f0d6a6; }
.num { position: absolute; top: 2px; left: 4px; font-size: 9px; font-family: var(--mono); color: rgba(0,0,0,.55); }
.cur { display: flex; align-items: center; gap: 8px; margin-top: 8px; padding: 6px 8px; border-radius: 6px;
  background: #101216; border: 1px solid var(--border-soft); font-size: 11px; }
.dot { width: 14px; height: 14px; border-radius: 4px; border: 1px solid rgba(255,255,255,.16); flex: 0 0 auto; }
`;

export class SoilPalette extends BaseElement {
  private model: EditorModel | null = null;
  private unsubscribe: (() => void) | null = null;
  private gridEl!: HTMLElement;
  private curEl!: HTMLElement;
  private lastMaterial = -1;

  protected render(): void {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.gridEl = h('div', { class: 'grid' });
    this.curEl = h('div', { class: 'cur' });
    this.root.append(style, this.gridEl, this.curEl);
    this.build();
  }

  attach(model: EditorModel): void {
    this.unsubscribe?.();
    this.model = model;
    this.unsubscribe = model.subscribe(() => this.sync());
    this.sync();
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private build(): void {
    clear(this.gridEl);
    for (const m of MATERIALS) {
      const btn = h('button', {
        class: 'sw',
        title: `${m.name}（快捷键 ${m.id}）`,
        onclick: () => {
          this.model?.setMaterial(m.id);
        },
      },
        h('span', { class: 'chip', style: `background:${m.hex}` }),
        h('span', { class: 'name' }, m.short),
        h('span', { class: 'num' }, String(m.id)),
      );
      btn.dataset.mat = String(m.id);
      this.gridEl.append(btn);
    }
  }

  private sync(): void {
    if (!this.model) return;
    const cur = this.model.material;
    if (cur === this.lastMaterial) return;
    this.lastMaterial = cur;
    for (const el of this.$$<HTMLElement>('.sw')) {
      el.classList.toggle('on', Number(el.dataset.mat) === cur);
    }
    const m = MATERIALS.find((x) => x.id === cur) ?? MATERIALS[0];
    clear(this.curEl);
    this.curEl.append(
      h('span', { class: 'dot', style: `background:${m.hex}` }),
      h('span', { class: 'strong' }, m.name),
      h('span', { class: 'faint tiny' }, `#${m.hex.slice(1)}`),
    );
  }
}

define('soil-palette', SoilPalette);

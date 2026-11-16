import { BaseElement, define } from './base';
import { h, clear, fmt, pct } from './dom';
import type { EditorModel } from '../state/editor';
import { layerLabel } from '../core/layers';

const CSS = `
:host { display: block; }
.card { background: #16191d; border: 1px solid var(--border-soft); border-radius: 8px; padding: 10px 12px; }
.head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.title { font-size: 12px; font-weight: 600; }
.score { font-family: var(--mono); font-size: 18px; font-weight: 600; }
.score.max { font-size: 11px; color: var(--fg-faint); font-weight: 400; }
.checks { display: flex; flex-direction: column; gap: 6px; }
.check { display: grid; grid-template-columns: 60px 1fr 54px; gap: 8px; align-items: center; font-size: 11px; }
.cbar { height: 5px; border-radius: 3px; background: #22262d; overflow: hidden; }
.cfill { height: 100%; border-radius: 3px; background: #6f9bc4; }
.cfill.pass { background: #7fb069; }
.cfill.fail { background: #cf6679; }
.cscore { font-family: var(--mono); text-align: right; color: var(--fg-dim); }
.ok { color: #a9cd96; }
.bad { color: #f0a8b5; }
.layers { margin-top: 9px; display: flex; flex-direction: column; gap: 4px; }
.lrow { display: grid; grid-template-columns: 52px 1fr 92px; gap: 7px; font-size: 10px; align-items: center; }
.lbar { position: relative; height: 8px; border-radius: 3px; background: #22262d; overflow: hidden; }
.lfill { height: 100%; background: linear-gradient(90deg, #7a5d2c, #d7a55a); }
.lmark { position: absolute; top: 0; bottom: 0; width: 1.5px; background: #bde0ff; opacity: .85; }
.lnum { font-family: var(--mono); color: var(--fg-faint); text-align: right; }
.issues { margin-top: 8px; display: flex; flex-direction: column; gap: 3px; }
.issue { font-size: 10.5px; color: #f0c6a0; display: flex; gap: 5px; align-items: flex-start; line-height: 1.45; }
.issue::before { content: '▲'; font-size: 7px; margin-top: 4px; color: #d98b64; flex: 0 0 auto; }
.legend { display: flex; gap: 10px; font-size: 9.5px; color: var(--fg-faint); margin-top: 4px; }
.legend i { display: inline-block; width: 8px; height: 3px; background: #bde0ff; vertical-align: middle; margin-right: 3px; }
.legend b { display: inline-block; width: 8px; height: 6px; background: #8a6a34; vertical-align: middle; margin-right: 3px; }
`;

export class GradePreview extends BaseElement {
  private model: EditorModel | null = null;
  private unsubscribe: (() => void) | null = null;
  private lastTick = -1;

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
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private sync(force = false): void {
    if (!this.model) return;
    if (!force && this.lastTick === this.model.tick) return;
    this.lastTick = this.model.tick;
    const m = this.model;
    // 面数变化不改变评分 → 用 tick 即可
    const g = m.grade();
    const stats = m.stats;
    const expected = m.expectedShares;

    const checks = h('div', { class: 'checks' });
    for (const c of g.checks) {
      const ratio = c.max > 0 ? c.score / c.max : 1;
      checks.append(
        h('div', { class: 'check' },
          h('span', { class: 'dim' }, c.label),
          h('div', { class: 'cbar' },
            h('div', { class: `cfill ${c.max === 0 ? '' : c.pass ? 'pass' : 'fail'}`, style: `width:${(ratio * 100).toFixed(1)}%` }),
          ),
          h('span', { class: `cscore ${c.pass ? 'ok' : 'bad'}` }, `${c.score.toFixed(1)}/${c.max.toFixed(0)}`),
        ),
      );
    }

    const layers = h('div', { class: 'layers' });
    for (const layer of m.layers) {
      const share = stats.shares[layer.index] ?? 0;
      const exp = expected[layer.index] ?? 0;
      const deviation = Math.abs(share - exp);
      const filled = stats.layerFilled[layer.index] ?? 0;
      layers.append(
        h('div', { class: 'lrow' },
          h('span', { class: deviation > 0.08 ? 'bad' : 'dim' }, layerLabel(layer.index)),
          h('div', { class: 'lbar' },
            h('div', { class: 'lfill', style: `width:${Math.min(100, share * 100).toFixed(1)}%` }),
            h('div', { class: 'lmark', style: `left:${Math.min(100, exp * 100).toFixed(1)}%` }),
          ),
          h('span', { class: 'lnum' }, `${pct(share, 0)} / ${pct(exp, 0)}${filled ? '' : ' 空'}`),
        ),
      );
    }

    const issues = h('div', { class: 'issues' });
    if (g.issues.length) {
      for (const issue of g.issues) {
        issues.append(h('div', { class: 'issue' }, `${issue.label}：${issue.detail}`));
      }
    }

    clear(this.root);
    const style = document.createElement('style');
    style.textContent = CSS;
    this.root.append(
      style,
      h('div', { class: 'card' },
        h('div', { class: 'head' },
          h('span', { class: 'title' }, '自动评分预览'),
          h('span', {},
            h('span', { class: `score ${g.total >= g.max * 0.6 ? 'ok' : 'bad'}` }, g.total.toFixed(1)),
            h('span', { class: 'score max' }, ` / ${g.max}`),
          ),
        ),
        checks,
        layers,
        h('div', { class: 'legend' },
          h('span', {}, h('b'), '实际占比'),
          h('span', {}, h('i'), '目标占比'),
        ),
        issues,
      ),
    );
  }
}

define('grade-preview', GradePreview);

// ===== Web Component 基类：Shadow DOM + Store 订阅 =====
import { store } from '../core/store';
import { sharedCSS } from './shared';

export abstract class BaseComponent extends HTMLElement {
  protected root: ShadowRoot;
  private unsub: (() => void) | null = null;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.unsub = store.subscribe(() => this.onState());
    this.render();
    this.onState();
  }

  disconnectedCallback() {
    this.unsub?.();
  }

  /** Store 变化时触发（默认重渲染，组件可覆盖做局部更新） */
  protected onState() {
    this.render();
  }

  protected abstract render(): void;

  protected shell(innerHTML: string, extraCSS = ''): void {
    this.root.innerHTML = `<style>${sharedCSS}${extraCSS}</style>${innerHTML}`;
  }

  protected $(sel: string): HTMLElement | null {
    return this.root.querySelector(sel);
  }

  protected $all(sel: string): HTMLElement[] {
    return [...this.root.querySelectorAll(sel)] as HTMLElement[];
  }
}

/** 简易模态弹窗 */
export function modal(title: string, bodyHTML: string): { close: () => void; root: ShadowRoot } {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${sharedCSS}
    .modal-card { background:#262b33; border:1px solid #3a414c; border-radius:10px;
      width:min(560px,92vw); max-height:86vh; overflow:auto; padding:20px;
      color:#e6e9ee; font:13px "Segoe UI","Microsoft YaHei",sans-serif; }
  </style>
  <div class="modal-card">
    <h3 style="margin-bottom:12px">${title}</h3>
    <div class="col">${bodyHTML}</div>
  </div>`;
  document.body.appendChild(host);
  const close = () => host.remove();
  host.addEventListener('click', (e) => { if (e.target === host) close(); });
  return { close, root: shadow };
}

export function toast(msg: string, kind: 'info' | 'ok' | 'err' = 'info') {
  const el = document.createElement('div');
  const color = kind === 'ok' ? '#35c48f' : kind === 'err' ? '#ef5f6b' : '#4ea1ff';
  el.style.cssText = `position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#2f353f;border:1px solid ${color};color:#e6e9ee;padding:10px 18px;border-radius:8px;z-index:2000;font:13px "Segoe UI","Microsoft YaHei",sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.4)`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; }, 2200);
  setTimeout(() => el.remove(), 2700);
}

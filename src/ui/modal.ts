import { BaseElement, define } from './base';
import { h, clear } from './dom';
import { DIALOG_CSS } from './dialogStyles';

const CSS = `
:host { position: fixed; inset: 0; z-index: 8000; display: none; }
.backdrop {
  position: absolute; inset: 0; background: rgba(8,9,11,.68); backdrop-filter: blur(3px);
  animation: fade .15s ease-out;
}
@keyframes fade { from { opacity: 0 } }
.panel {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(640px, 94vw); max-height: min(86vh, 900px); display: flex; flex-direction: column;
  background: #191c21; border: 1px solid #333a43; border-radius: 12px;
  box-shadow: 0 24px 70px rgba(0,0,0,.6); overflow: hidden;
  animation: pop .16s ease-out;
}
@keyframes pop { from { opacity: 0; transform: translate(-50%, -48%) scale(.985) } }
.head { display: flex; align-items: center; gap: 10px; padding: 14px 18px 10px; }
.title { font-size: 14px; font-weight: 600; flex: 1 1 auto; min-width: 0; }
.x { background: transparent; border: 0; color: var(--fg-dim); font-size: 17px; padding: 2px 7px; border-radius: 5px; }
.x:hover { background: var(--bg-hover); color: var(--fg); }
.body { padding: 4px 18px 16px; overflow-y: auto; }
:host([wide]) .panel { width: min(1120px, 96vw); }
`;

export class ModalDialog extends BaseElement {
  private titleEl!: HTMLElement;
  private bodyEl!: HTMLElement;
  private onClose: (() => void) | null = null;

  protected render(): void {
    const style = document.createElement('style');
    style.textContent = CSS + DIALOG_CSS;
    const backdrop = h('div', {
      class: 'backdrop',
      onclick: () => this.close(),
    });
    this.titleEl = h('div', { class: 'title' });
    this.bodyEl = h('div', { class: 'body' });
    const panel = h('div', { class: 'panel', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'head' },
        this.titleEl,
        h('button', { class: 'x', title: '关闭（Esc）', onclick: () => this.close() }, '✕'),
      ),
      this.bodyEl,
    );
    this.root.append(style, backdrop, panel);
    this.root.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') this.close();
    });
    this.tabIndex = -1;
    // 共享样式表会给 :host 设 display:block；这里用内联样式保证关闭时完全不遮挡界面
    this.style.display = 'none';
  }

  static instance(): ModalDialog {
    let el = document.querySelector('modal-dialog') as ModalDialog | null;
    if (!el) {
      el = document.createElement('modal-dialog') as ModalDialog;
      document.body.append(el);
    }
    return el;
  }

  open(opts: { title: string; content: Node; onClose?: () => void; wide?: boolean }): void {
    this.titleEl.textContent = opts.title;
    clear(this.bodyEl);
    this.bodyEl.append(opts.content);
    this.onClose = opts.onClose ?? null;
    if (opts.wide) this.setAttribute('wide', '');
    else this.removeAttribute('wide');
    this.setAttribute('open', '');
    this.style.display = 'block';
    this.focus();
  }

  close(): void {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.style.display = 'none';
    const cb = this.onClose;
    this.onClose = null;
    clear(this.bodyEl);
    cb?.();
  }
}

define('modal-dialog', ModalDialog);

export const modal = {
  open(title: string, content: Node, opts: { onClose?: () => void; wide?: boolean } = {}): void {
    ModalDialog.instance().open({ title, content, ...opts });
  },
  close(): void {
    const el = document.querySelector('modal-dialog') as ModalDialog | null;
    el?.close();
  },
};

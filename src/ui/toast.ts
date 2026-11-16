import { BaseElement, define } from './base';
import { h } from './dom';

const CSS = `
:host {
  position: fixed; z-index: 9000; right: 16px; bottom: 16px;
  display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
  pointer-events: none; max-width: min(440px, 92vw);
}
.toast {
  pointer-events: auto; display: flex; gap: 9px; align-items: flex-start;
  padding: 9px 13px; border-radius: 8px; font-size: 12px; line-height: 1.5;
  background: #1d2126; border: 1px solid #333a43; color: #e6e2d8;
  box-shadow: 0 8px 26px rgba(0,0,0,.45);
  animation: in .18s ease-out;
  max-width: 100%;
}
.toast.out { animation: out .2s ease-in forwards; }
@keyframes in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
@keyframes out { to { opacity: 0; transform: translateY(6px) } }
.dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 5px; flex: 0 0 auto; background: var(--info); }
.toast.ok { border-color: #3c5232; } .toast.ok .dot { background: var(--ok); }
.toast.warn { border-color: #5a4526; } .toast.warn .dot { background: var(--warn); }
.toast.error { border-color: #5c2f39; } .toast.error .dot { background: var(--bad); }
.msg { min-width: 0; word-break: break-word; }
.action { margin-left: auto; }
.action button { padding: 2px 8px; font-size: 11px; }
`;

export interface ToastOptions {
  kind?: 'info' | 'ok' | 'warn' | 'error';
  ms?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export class ToastHost extends BaseElement {
  protected render(): void {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.root.append(style);
    this.setAttribute('role', 'status');
    this.setAttribute('aria-live', 'polite');
  }

  show(message: string, opts: ToastOptions = {}): void {
    const kind = opts.kind ?? 'info';
    const toast = h('div', { class: `toast ${kind}` },
      h('span', { class: 'dot' }),
      h('span', { class: 'msg' }, message),
    );
    if (opts.actionLabel) {
      toast.append(
        h('span', { class: 'action' },
          h('button', {
            onclick: () => {
              opts.onAction?.();
              this.dismiss(toast);
            },
          }, opts.actionLabel),
        ),
      );
    }
    this.root.append(toast);
    const ms = opts.ms ?? (kind === 'error' ? 6000 : kind === 'warn' ? 5000 : 3200);
    setTimeout(() => this.dismiss(toast), ms);
    while (this.root.querySelectorAll('.toast').length > 4) {
      const first = this.root.querySelector('.toast');
      if (first) this.dismiss(first as HTMLElement);
    }
  }

  private dismiss(el: HTMLElement): void {
    if (!el.isConnected || el.classList.contains('out')) return;
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
  }
}

define('toast-host', ToastHost);

let host: ToastHost | null = null;

export function toast(message: string, kind: ToastOptions['kind'] = 'info', opts: ToastOptions = {}): void {
  if (typeof document === 'undefined') return;
  if (!host || !host.isConnected) {
    host = document.querySelector('toast-host') as ToastHost | null;
    if (!host) {
      host = document.createElement('toast-host') as ToastHost;
      document.body.append(host);
    }
  }
  host.show(message, { kind, ...opts });
}

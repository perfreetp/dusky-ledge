import { adoptStyles } from './styles';

/**
 * 所有界面组件的基类：负责 shadow DOM 初始化与可选的“连接后渲染”。
 */
export abstract class BaseElement extends HTMLElement {
  protected root: ShadowRoot;
  private rendered = false;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    adoptStyles(this.root);
  }

  connectedCallback(): void {
    if (!this.rendered) {
      this.rendered = true;
      this.render();
    }
    this.onConnected();
  }

  disconnectedCallback(): void {
    this.onDisconnected();
  }

  protected onConnected(): void {}
  protected onDisconnected(): void {}

  /** 首次连接时调用；子类实现 */
  protected abstract render(): void;

  /** 请求重绘全部内容（子类可选择自行增量更新） */
  requestRefresh(): void {
    if (this.rendered) this.render();
  }

  $(sel: string): HTMLElement | null {
    return this.root.querySelector(sel);
  }

  $$<T extends Element = HTMLElement>(sel: string): T[] {
    return Array.from(this.root.querySelectorAll<T>(sel));
  }

  /** 派发冒泡的自定义事件（跨越 shadow 边界） */
  emit<T>(type: string, detail?: T, composed = true): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed }));
  }
}

export function define(name: string, ctor: CustomElementConstructor): void {
  if (!customElements.get(name)) customElements.define(name, ctor);
}

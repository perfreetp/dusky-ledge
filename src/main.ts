// ===== 入口：先初始化持久化，再注册 Web Components =====
import { store } from './core/store';
import { AppRoot } from './ui/app-root';
import { TopBar } from './ui/top-bar';
import { BoardView } from './ui/board-view';
import { OrdersView } from './ui/orders-view';
import { EditorWorkspace } from './editor/editor-workspace';

// 全局基础样式（document 层）
const style = document.createElement('style');
style.textContent = `
  html, body { margin:0; height:100%; background:#1e2228; }
  body { font-family: "Segoe UI", "Microsoft YaHei", system-ui, sans-serif; }
  button { font-family: inherit; }
`;
document.head.appendChild(style);

async function bootstrap() {
  await store.init();
  customElements.define('app-root', AppRoot);
  customElements.define('top-bar', TopBar);
  customElements.define('board-view', BoardView);
  customElements.define('orders-view', OrdersView);
  customElements.define('editor-workspace', EditorWorkspace);
}

bootstrap();

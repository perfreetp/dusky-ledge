import { BaseElement, define } from './base';
import { h, clear } from './dom';
import type { EditorModel, Tool } from '../state/editor';

const CSS = `
:host { display: block; }
.tb { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.group { display: flex; gap: 4px; align-items: center; padding: 3px; background: #16191d;
  border: 1px solid var(--border-soft); border-radius: 8px; }
.group + .group { margin-left: 2px; }
.tool { display: flex; align-items: center; gap: 5px; padding: 5px 9px; font-size: 12px; }
.tool.on { background: var(--accent-soft); border-color: var(--accent); color: #f3d8a8; }
.kbd { font-family: var(--mono); font-size: 9px; padding: 0 3px; border: 1px solid #3a4048;
  border-radius: 3px; color: var(--fg-faint); }
.tool.on .kbd { border-color: #6b5426; color: #d9bc84; }
.mirror.on { background: #1e2f3a; border-color: #4d7f9e; color: #b8dcf2; }
.mirror-icon { display: inline-flex; gap: 2px; align-items: center; }
.mirror-icon span { display: block; width: 5px; height: 11px; background: currentColor; opacity: .85; border-radius: 1px; }
.mirror-icon .l { opacity: .45; }
.sub { font-size: 10px; color: var(--fg-faint); margin-left: 4px; }
.sel-actions { display: flex; gap: 4px; align-items: center; }
`;

type ToolDef = { id: Tool; label: string; key: string; hint: string };

const TOOLS: ToolDef[] = [
  { id: 'place', label: '放置', key: 'B', hint: '左键放置体素，可拖拽连续放置' },
  { id: 'erase', label: '擦除', key: 'E', hint: '左键删除命中体素' },
  { id: 'hide', label: '隐藏', key: 'H', hint: '单击隐藏/恢复单个命中体素' },
  { id: 'select', label: '框选', key: 'R', hint: '拖拽框选（Shift 跨层），用于复制/平移' },
  { id: 'eyedrop', label: '吸色', key: 'I', hint: '拾取命中体素的土色' },
  { id: 'orbit', label: '浏览', key: 'V', hint: '仅旋转视图，不做编辑' },
];

export class EditorToolbar extends BaseElement {
  private model: EditorModel | null = null;
  private unsubscribe: (() => void) | null = null;
  private onPasteToLayer: ((layer: number, copy: boolean) => void) | null = null;
  private onClearSelection: (() => void) | null = null;

  protected render(): void {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.root.append(style);
    this.paint();
  }

  attach(model: EditorModel, handlers: {
    pasteToLayer?: (layer: number, copy: boolean) => void;
    clearSelection?: () => void;
  } = {}): void {
    this.unsubscribe?.();
    this.model = model;
    this.onPasteToLayer = handlers.pasteToLayer ?? null;
    this.onClearSelection = handlers.clearSelection ?? null;
    this.unsubscribe = model.subscribe(() => this.paint());
    this.paint();
  }

  override disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private paint(): void {
    const m = this.model;
    if (!m) return;
    clear(this.root);
    const style = document.createElement('style');
    style.textContent = CSS;
    this.root.append(style);
    const toolGroup = h('div', { class: 'group' });
    for (const t of TOOLS) {
      toolGroup.append(
        h('button', {
          class: `tool ${m.tool === t.id ? 'on' : ''}`,
          title: `${t.hint}（${t.key}）`,
          'data-tool': t.id,
          onclick: () => m.setTool(t.id),
        },
          t.label,
          h('span', { class: 'kbd' }, t.key),
        ),
      );
    }

    const historyGroup = h('div', { class: 'group' },
      h('button', {
        class: 'tool',
        title: '撤销（Ctrl+Z）',
        disabled: !m.canUndo,
        onclick: () => m.undo(),
      }, '↶ 撤销'),
      h('button', {
        class: 'tool',
        title: '重做（Ctrl+Shift+Z）',
        disabled: !m.canRedo,
        onclick: () => m.redo(),
      }, '↷ 重做'),
    );

    const mirrorBtn = h('button', {
      class: `tool mirror ${m.mirror ? 'on' : ''}`,
      title: '左右镜像编辑：开启后一次编辑两侧同时落块（M）',
      'data-testid': 'mirror-toggle',
      onclick: () => m.toggleMirror(),
    },
      h('span', { class: 'mirror-icon' }, h('span', { class: 'l' }), h('span', {})),
      '镜像',
      h('span', { class: 'kbd' }, 'M'),
    );

    const selGroup = h('div', { class: 'group sel-actions' });
    if (m.selection) {
      const box = m.selection;
      const w = box.x1 - box.x0 + 1;
      const hgt = box.y1 - box.y0 + 1;
      const d = box.z1 - box.z0 + 1;
      selGroup.append(
        h('span', { class: 'sub' }, `选区 ${w}×${hgt}×${d}`),
        h('button', {
          class: 'tool',
          title: '复制选区（Ctrl+C）',
          onclick: () => {
            const n = m.copySelection();
            this.emit('toast', { message: `已复制 ${n} 个体素`, kind: 'ok' });
          },
        }, '复制'),
        h('button', {
          class: 'tool',
          title: '把选区整体平移到当前层（Ctrl+M）',
          onclick: () => this.onPasteToLayer?.(m.currentLayerIndex, false),
        }, '平移到本层'),
        h('button', {
          class: 'tool',
          title: '把选区复制到当前层（Ctrl+V）',
          onclick: () => this.onPasteToLayer?.(m.currentLayerIndex, true),
        }, '复制到本层'),
        h('button', {
          class: 'tool',
          title: '填充选区为当前土色',
          onclick: () => m.fillSelection(),
        }, '填充'),
        h('button', {
          class: 'tool',
          title: '清除选区内体素',
          onclick: () => m.clearSelection(),
        }, '清除'),
        h('button', {
          class: 'tool', title: '取消框选（Esc）', onclick: () => this.onClearSelection?.(),
        }, '✕'),
      );
    } else {
      selGroup.append(h('span', { class: 'sub' }, '框选工具可拖出选区'));
    }

    const viewGroup = h('div', { class: 'group' },
      h('button', {
        class: `tool ${m.revealHidden ? 'on' : ''}`,
        title: '把被单独隐藏的体素以半透明显示出来，便于点中恢复',
        disabled: m.hiddenVoxels === 0 && !m.revealHidden,
        onclick: () => m.toggleRevealHidden(),
      }, m.revealHidden ? '隐藏体素已显形' : '显示隐藏体素',
        m.hiddenVoxels ? h('span', { class: 'sub' }, String(m.hiddenVoxels)) : null),
    );

    this.root.append(
      h('div', { class: 'tb' }, toolGroup, historyGroup,
        h('div', { class: 'group' }, mirrorBtn),
        viewGroup,
        selGroup),
    );
  }
}

define('editor-toolbar', EditorToolbar);

import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import type { BoolOp, MaterialKey, Pt } from '../types';
import { BOOL_OP_LABELS, MATERIAL_LABELS } from '../types';
import { EditorScene } from '../three/editorScene';
import { snapPoint, type SnapResult } from '../geometry/snap';
import { validateContour } from '../geometry/validate';
import { buildPattern } from '../geometry/boolean';
import { editorStore } from '../store/editorStore';
import { appStore } from '../store/appStore';

const MATERIALS: MaterialKey[] = ['matte-black', 'champagne', 'fluoro-gray'];
const OPS: BoolOp[] = ['union', 'subtract', 'intersect'];

export default function PatternEditor() {
  let container!: HTMLDivElement;
  let scene: EditorScene;
  const [cursor, setCursor] = createSignal<Pt | null>(null);
  const [snapInfo, setSnapInfo] = createSignal<SnapResult | null>(null);
  const [savedTip, setSavedTip] = createSignal('');

  const { state, history, actions } = editorStore;

  // 每个轮廓的校验结果
  const issues = createMemo(() => {
    const m = new Map<string, ReturnType<typeof validateContour>>();
    for (const c of state.contours) m.set(c.id, validateContour(c));
    return m;
  });
  const allIssues = createMemo(() =>
    state.contours.flatMap((c) =>
      (issues().get(c.id) ?? []).map((i) => ({ contour: c, issue: i })),
    ),
  );
  const pattern = createMemo(() => buildPattern(state.contours));

  const activeOrder = () => appStore.getOrder(appStore.state.activeOrderId);

  onMount(() => {
    scene = new EditorScene(container);
    scene.setGrid(state.snapSpacing);
    scene.setLightMode(state.lightMode);

    scene.onPlaneMove = (raw) => {
      const s = snapPoint(
        raw,
        state.contours,
        state.draft,
        state.snapSpacing,
      );
      setCursor(s.point);
      setSnapInfo(s);
      scene.setSnapMarker(s.point, s.kind);
    };
    scene.onPlaneClick = (raw) => {
      const s = snapPoint(
        raw,
        state.contours,
        state.draft,
        state.snapSpacing,
      );
      // 点击草稿起点附近 → 闭合轮廓
      if (state.draft.length >= 3) {
        const first = state.draft[0];
        if (Math.hypot(s.point.x - first.x, s.point.y - first.y) <= 10) {
          actions.closeDraft();
          return;
        }
      }
      actions.addDraftPoint(s.point);
    };

    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) actions.redo();
        else actions.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        actions.redo();
      } else if (e.key === 'Enter') {
        actions.closeDraft();
      } else if (e.key === 'Escape') {
        actions.cancelDraft();
      } else if (e.key === 'Backspace' && state.draft.length > 0) {
        const t = e.target as HTMLElement;
        if (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') {
          e.preventDefault();
          actions.deleteLastDraftPoint();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    onCleanup(() => window.removeEventListener('keydown', onKey));
  });

  // 场景同步
  createEffect(() => scene?.setGrid(state.snapSpacing));
  createEffect(() => scene?.setLightMode(state.lightMode));
  createEffect(() => {
    scene?.updateDrawing(
      state.contours,
      issues(),
      state.draft,
      cursor(),
      state.thickness,
    );
  });
  createEffect(() => {
    if (state.showSolid) {
      scene?.updateSolid(pattern(), state.thickness, state.material);
    } else {
      scene?.updateSolid([], state.thickness, state.material);
    }
  });

  onCleanup(() => scene?.dispose());

  const saveToOrder = () => {
    const orderId = appStore.state.activeOrderId;
    const panelId = appStore.state.editingPanelId;
    if (!orderId || !panelId) return;
    appStore.actions.savePanel(orderId, {
      id: panelId,
      name: state.panelName,
      contours: JSON.parse(JSON.stringify(state.contours)),
      thickness: state.thickness,
      material: state.material,
      updatedAt: new Date().toISOString(),
    });
    setSavedTip('已保存到订单 ✓');
    setTimeout(() => setSavedTip(''), 2000);
  };

  const snapKindLabel = (k?: string) =>
    (
      ({
        endpoint: '端点',
        midpoint: '中线',
        edge: '边',
        grid: '网格',
      }) as Record<string, string>
    )[k ?? ''] ?? '';

  return (
    <div class="editor-layout">
      <div ref={container} class="viewport" />
      <aside class="side-panel">
        <Show when={activeOrder()}>
          {(o) => (
            <section class="card hint-card">
              正在编辑订单 <b>{o().customer}</b>（{o().gateType}{' '}
              {o().openingW}×{o().openingH}mm）的花板
              <div class="row">
                <input
                  class="text-input"
                  value={state.panelName}
                  onInput={(e) => actions.setPanelName(e.currentTarget.value)}
                />
                <button class="btn primary" onClick={saveToOrder}>
                  保存到订单
                </button>
              </div>
              <span class="ok-text">{savedTip()}</span>
            </section>
          )}
        </Show>

        <section class="card">
          <h3>绘制</h3>
          <p class="dim">
            左键单击放置顶点 · 点击起点或回车闭合 · Esc 取消 · Backspace
            删上一点 · 右键拖动旋转 · 左键拖动平移
          </p>
          <div class="row">
            <button
              class="btn"
              disabled={state.draft.length < 3}
              onClick={() => actions.closeDraft()}
            >
              闭合轮廓 ({state.draft.length}点)
            </button>
            <button
              class="btn"
              disabled={state.draft.length === 0}
              onClick={() => actions.cancelDraft()}
            >
              取消草稿
            </button>
          </div>
          <div class="row">
            <button
              class="btn"
              disabled={history.undoCount === 0}
              onClick={() => actions.undo()}
            >
              ↩ 撤销 {history.undoCount}/20
            </button>
            <button
              class="btn"
              disabled={history.redoCount === 0}
              onClick={() => actions.redo()}
            >
              ↪ 重做 {history.redoCount}/20
            </button>
          </div>
          <label class="slider-row">
            网格吸附间距 <b>{state.snapSpacing}mm</b>
            <input
              type="range"
              min="2"
              max="10"
              step="1"
              value={state.snapSpacing}
              onInput={(e) =>
                actions.setSnapSpacing(+e.currentTarget.value)
              }
            />
          </label>
          <Show when={snapInfo()}>
            {(s) => (
              <p class="snap-readout">
                吸附: {snapKindLabel(s().kind)} · ({Math.round(s().point.x)},{' '}
                {Math.round(s().point.y)}) mm
              </p>
            )}
          </Show>
        </section>

        <section class="card">
          <h3>轮廓与布尔运算</h3>
          <Show
            when={state.contours.length > 0}
            fallback={<p class="dim">还没有轮廓,在左侧视图中开始绘制。</p>}
          >
            <For each={state.contours}>
              {(c, i) => {
                const iss = () => issues().get(c.id) ?? [];
                return (
                  <div class={`contour-item ${iss().length ? 'bad' : ''}`}>
                    <span class="contour-name">
                      #{i() + 1} · {c.points.length}点
                    </span>
                    <select
                      value={c.op}
                      disabled={i() === 0}
                      title={i() === 0 ? '首个轮廓为基底' : ''}
                      onChange={(e) =>
                        actions.setContourOp(
                          c.id,
                          e.currentTarget.value as BoolOp,
                        )
                      }
                    >
                      <For each={OPS}>
                        {(op) => <option value={op}>{BOOL_OP_LABELS[op]}</option>}
                      </For>
                    </select>
                    <button
                      class="btn danger small"
                      onClick={() => actions.deleteContour(c.id)}
                    >
                      删
                    </button>
                  </div>
                );
              }}
            </For>
          </Show>
          <Show when={allIssues().length > 0}>
            <ul class="issue-list">
              <For each={allIssues()}>
                {(x) => <li>⚠ {x.issue.message}</li>}
              </For>
            </ul>
          </Show>
        </section>

        <section class="card">
          <h3>挤出与外观</h3>
          <label class="slider-row">
            板厚 <b>{state.thickness}mm</b> (2–8)
            <input
              type="range"
              min="2"
              max="8"
              step="0.5"
              value={state.thickness}
              onChange={(e) => actions.setThickness(+e.currentTarget.value)}
            />
          </label>
          <div class="row">
            <For each={MATERIALS}>
              {(m) => (
                <button
                  class={`btn swatch swatch-${m} ${state.material === m ? 'active' : ''}`}
                  onClick={() => actions.setMaterial(m)}
                >
                  {MATERIAL_LABELS[m]}
                </button>
              )}
            </For>
          </div>
          <div class="row">
            <button
              class={`btn ${state.lightMode === 'sun' ? 'active' : ''}`}
              onClick={() => actions.setLightMode('sun')}
            >
              ☀ 正午日光
            </button>
            <button
              class={`btn ${state.lightMode === 'spots' ? 'active' : ''}`}
              onClick={() => actions.setLightMode('spots')}
            >
              💡 射灯
            </button>
            <button
              class={`btn ${state.showSolid ? 'active' : ''}`}
              onClick={() => actions.setShowSolid(!state.showSolid)}
            >
              实体
            </button>
          </div>
          <button class="btn" onClick={() => scene?.resetCamera()}>
            复位视角
          </button>
        </section>
      </aside>
    </div>
  );
}

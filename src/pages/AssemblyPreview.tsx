import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import { AssemblyScene, type SnapGuide } from '../three/frameScene';
import { buildPattern } from '../geometry/boolean';
import { appStore } from '../store/appStore';
import { MATERIAL_LABELS, type LightMode } from '../types';

export default function AssemblyPreview() {
  let container!: HTMLDivElement;
  let scene: AssemblyScene;
  const [guides, setGuides] = createSignal<SnapGuide[]>([]);
  const [lightMode, setLightMode] = createSignal<LightMode>('sun');

  const ordersWithPanels = createMemo(() =>
    appStore.state.orders.filter((o) => o.panels.length > 0),
  );
  const order = createMemo(() => {
    const cur = ordersWithPanels();
    const byId = appStore.getOrder(appStore.state.activeOrderId);
    if (byId && byId.panels.length > 0) return byId;
    return cur[0] ?? null;
  });
  const panel = createMemo(() => {
    const o = order();
    if (!o) return null;
    return (
      o.panels.find((p) => p.id === appStore.state.assemblyPanelId) ??
      o.panels[0] ??
      null
    );
  });
  const pattern = createMemo(() => {
    const p = panel();
    return p ? buildPattern(p.contours) : [];
  });

  onMount(() => {
    scene = new AssemblyScene(container);
    scene.onSnap = setGuides;
    scene.onPanelMove = (pos) => appStore.actions.setPanelPos(pos);
  });

  createEffect(() => {
    const o = order();
    if (scene && o) scene.buildFrame(o.openingW, o.openingH);
  });
  createEffect(() => {
    const p = panel();
    if (scene && p) {
      scene.setPanel(pattern(), p.thickness, p.material, appStore.state.panelPos);
    }
  });
  createEffect(() => scene?.setLightMode(lightMode()));

  onCleanup(() => scene?.dispose());

  return (
    <div class="editor-layout">
      <div ref={container} class="viewport" />
      <aside class="side-panel">
        <section class="card">
          <h3>装配预览</h3>
          <Show
            when={order()}
            fallback={
              <p class="dim">
                还没有带花板的订单。请先在「订单交付」中创建订单并绘制花板。
              </p>
            }
          >
            {(o) => (
              <>
                <label class="field">
                  订单
                  <select
                    value={o().id}
                    onChange={(e) => {
                      appStore.actions.setActiveOrder(e.currentTarget.value);
                      appStore.actions.setAssemblyPanel(null);
                    }}
                  >
                    <For each={ordersWithPanels()}>
                      {(ord) => (
                        <option value={ord.id}>
                          {ord.customer} · {ord.gateType} · {ord.openingW}×
                          {ord.openingH}
                        </option>
                      )}
                    </For>
                  </select>
                </label>
                <label class="field">
                  花板
                  <select
                    value={panel()?.id ?? ''}
                    onChange={(e) =>
                      appStore.actions.setAssemblyPanel(e.currentTarget.value)
                    }
                  >
                    <For each={o().panels}>
                      {(p) => (
                        <option value={p.id}>
                          {p.name} · {p.thickness}mm · {MATERIAL_LABELS[p.material]}
                        </option>
                      )}
                    </For>
                  </select>
                </label>
                <p class="dim">
                  拖动花板与立柱内侧面、横档中线自动对齐;右键旋转视角。
                </p>
                <p class="snap-readout">
                  {guides().length > 0
                    ? `已对齐: ${guides()
                        .map((g) => (g.axis === 'x' ? '立柱/中线' : '横档'))
                        .join('、')}`
                    : '拖动花板进行对齐'}
                </p>
                <div class="row">
                  <button
                    class={`btn ${lightMode() === 'sun' ? 'active' : ''}`}
                    onClick={() => setLightMode('sun')}
                  >
                    ☀ 正午日光
                  </button>
                  <button
                    class={`btn ${lightMode() === 'spots' ? 'active' : ''}`}
                    onClick={() => setLightMode('spots')}
                  >
                    💡 射灯
                  </button>
                </div>
                <Show
                  when={o().status === '已通过'}
                  fallback={
                    <p class="dim">订单审核通过后可导出装配效果图。</p>
                  }
                >
                  <button
                    class="btn primary"
                    onClick={() =>
                      scene?.exportPng(
                        `装配效果图-${o().customer}-${o().gateType}.png`,
                      )
                    }
                  >
                    导出装配效果图 PNG
                  </button>
                </Show>
              </>
            )}
          </Show>
        </section>
      </aside>
    </div>
  );
}

import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { store } from '@/state/editor';
import { SceneRenderer } from '@/render/scene';
import { drawOverlay, drawRulers, preloadImage } from '@/render/overlay';
import { useCanvasInteractions } from '@/components/useCanvasInteractions';

export default defineComponent({
  name: 'PlanCanvas',
  props: {
    readOnly: { type: Boolean, default: false },
    showRulers: { type: Boolean, default: true },
  },
  setup(props) {
    const wrap = ref<HTMLDivElement | null>(null);
    const gpuCanvas = ref<HTMLCanvasElement | null>(null);
    const overlay = ref<HTMLCanvasElement | null>(null);
    const rulerTop = ref<HTMLCanvasElement | null>(null);
    const rulerLeft = ref<HTMLCanvasElement | null>(null);
    const paper = ref<HTMLDivElement | null>(null);
    const bgImg = ref<HTMLImageElement | null>(null);
    const bgSrc = ref<string>('');
    const sceneRef = ref<SceneRenderer | null>(null);
    let raf = 0;
    let observer: ResizeObserver | null = null;
    let lastBuildKey = '';
    let overlayDirty = true;
    let lastPaperKey = '';

    // Geometry is rebuilt on document edits, but also when the zoom crosses a
    // power-of-two bucket so the hatch LOD keeps the on-screen density sane
    // without rebuilding on every wheel tick.
    let lastZoomBucket = 0;
    const zoomBucket = () => Math.round(Math.log2(Math.max(1e-6, store.camera.scale)) * 2);
    const rebuildKey = () =>
      `${store.historyVersion.value}:${store.doc.value.features.length}:${lastZoomBucket}`;
    const noteZoom = () => {
      const b = zoomBucket();
      if (b !== lastZoomBucket) {
        lastZoomBucket = b;
      }
    };
    const markOverlayDirty = () => {
      overlayDirty = true;
    };

    const layoutPaper = () => {
      const el = paper.value;
      if (!el) return;
      const { camera } = store;
      const key = `${camera.scale}:${camera.tx}:${camera.ty}:${camera.width}:${camera.height}:${store.doc.value.width}:${store.doc.value.height}`;
      const bg = store.doc.value.background;
      const bgKey = bg ? `${bg.url}:${bg.x}:${bg.y}:${bg.width}:${bg.height}:${bg.opacity}:${bg.visible}` : 'none';
      if (key + '|' + bgKey === lastPaperKey) return;
      lastPaperKey = key + '|' + bgKey;
      const toScreen = (x: number, y: number) => ({
        x: (x - camera.tx) / camera.scale,
        y: (y - camera.ty) / camera.scale,
      });
      const a = toScreen(0, 0);
      const b = toScreen(store.doc.value.width, store.doc.value.height);
      el.style.left = `${a.x}px`;
      el.style.top = `${a.y}px`;
      el.style.width = `${b.x - a.x}px`;
      el.style.height = `${b.y - a.y}px`;
      const img = bgImg.value;
      if (img) {
        if (bg?.visible && bg.url) {
          const c = toScreen(bg.x, bg.y);
          const d = toScreen(bg.x + bg.width, bg.y + bg.height);
          img.style.display = 'block';
          img.style.left = `${c.x - a.x}px`;
          img.style.top = `${c.y - a.y}px`;
          img.style.width = `${d.x - c.x}px`;
          img.style.height = `${d.y - c.y}px`;
          img.style.opacity = String(bg.opacity);
        } else {
          img.style.display = 'none';
        }
      }
    };

    const syncBackground = async () => {
      const url = store.doc.value.background?.url ?? '';
      if (url === bgSrc.value) return;
      bgSrc.value = url;
      if (!url) return;
      try {
        await preloadImage(url);
        if (bgImg.value) bgImg.value.src = url;
        overlayDirty = true;
      } catch {
        store.toast('底图加载失败', 'error');
      }
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const scene = sceneRef.value;
      const canvas = overlay.value;
      if (!scene || !canvas) return;
      noteZoom();
      const key = rebuildKey();
      if (key !== lastBuildKey) {
        lastBuildKey = key;
        const stats = scene.build(store.doc.value.features);
        Object.assign(store.gpuStats, stats);
        overlayDirty = true;
      }
      scene.render({
        scale: store.camera.scale,
        tx: store.camera.tx,
        ty: store.camera.ty,
        width: store.camera.width,
        height: store.camera.height,
      });
      layoutPaper();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.round(store.camera.width * dpr);
      const ch = Math.round(store.camera.height * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
        overlayDirty = true;
      }
      if (overlayDirty) {
        overlayDirty = false;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawOverlay(ctx, {
            camera: store.camera,
            dpr,
            grid: { minor: store.grid.minor, major: store.grid.major, show: store.grid.show },
            docWidth: store.doc.value.width,
            docHeight: store.doc.value.height,
            features: store.features,
            selected: store.selectedFeatures,
            selectedVertices: store.selectedVertices.value,
            draft: store.draft.value,
            snap: store.snapHit.value ? { point: store.snapHit.value.point, kind: store.snapHit.value.kind } : null,
            marquee: interactions.marquee.value,
            hoverId: store.hoverId.value,
            showDimensions: store.doc.value.settings.showDimensions,
            calibration: store.calibration.value,
          });
          if (props.showRulers) {
            for (const c of [rulerTop.value, rulerLeft.value]) {
              if (!c) continue;
              const rw = Math.round(store.camera.width * dpr);
              const rh = Math.round(store.camera.height * dpr);
              if (c === rulerTop.value) {
                if (c.width !== rw || c.height !== Math.round(22 * dpr)) {
                  c.width = rw;
                  c.height = Math.round(22 * dpr);
                }
              } else if (c.width !== Math.round(22 * dpr) || c.height !== rh) {
                c.width = Math.round(22 * dpr);
                c.height = rh;
              }
            }
            if (rulerTop.value) {
              const rctx = rulerTop.value.getContext('2d');
              if (rctx) drawRulers(rctx, store.camera, dpr, 22);
            }
            if (rulerLeft.value) {
              const lctx = rulerLeft.value.getContext('2d');
              if (lctx) drawRulers(lctx, store.camera, dpr, 22);
            }
          }
        }
      }
    };

    const interactions = useCanvasInteractions({
      overlayCanvas: overlay,
      markOverlayDirty,
      readOnly: () => props.readOnly,
    });

    onMounted(async () => {
      const canvas = gpuCanvas.value!;
      const scene = new SceneRenderer(canvas);
      sceneRef.value = scene;
      const ok = await scene.init();
      store.gpuStats.gpu = ok;
      store.gpuStats.adapterInfo = scene.info;
      if (!ok) {
        store.toast('当前浏览器未启用 WebGPU，已切换到 Canvas2D 兼容渲染（性能会下降）', 'error');
      }
      interactions.attach();
      const el = wrap.value!;
      const measure = () => {
        const rect = el.getBoundingClientRect();
        store.setViewport(Math.max(80, rect.width), Math.max(80, rect.height));
        overlayDirty = true;
        lastPaperKey = '';
      };
      measure();
      store.zoomToFitDoc();
      observer = new ResizeObserver(measure);
      observer.observe(el);
      raf = requestAnimationFrame(frame);
      const invalidate = () => {
        overlayDirty = true;
      };
      watch(() => store.historyVersion.value, invalidate);
      watch(() => store.selection.value, invalidate, { deep: true });
      watch(() => store.hoverId.value, invalidate);
      watch(() => store.snapHit.value, invalidate);
      watch(() => store.camera.scale, invalidate);
      watch(() => [store.camera.tx, store.camera.ty], invalidate);
      watch(() => store.draft.value, invalidate, { deep: true });
      watch(() => store.doc.value.background?.url, syncBackground);
      watch(() => store.selectedVertices.value, invalidate, { deep: true });
    });

    onBeforeUnmount(() => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      interactions.detach();
      sceneRef.value?.destroy();
    });

    return () =>
      h('div', { ref: wrap, class: 'canvas-wrap' }, [
        h('div', { ref: paper, class: 'paper-layer' }, [
          h('img', {
            ref: bgImg,
            class: 'bg-image',
            alt: '',
            draggable: false,
            onLoad: () => {
              overlayDirty = true;
              lastPaperKey = '';
            },
          }),
        ]),
        h('canvas', { ref: gpuCanvas, class: 'layer gpu-layer' }),
        h('canvas', { ref: overlay, class: 'layer overlay-layer' }),
        props.showRulers ? h('canvas', { ref: rulerTop, class: 'ruler ruler-top' }) : null,
        props.showRulers ? h('canvas', { ref: rulerLeft, class: 'ruler ruler-left' }) : null,
        h('div', { class: 'canvas-badge' }, [
          h('span', { class: store.gpuStats.gpu ? 'dot on' : 'dot off' }),
          h('span', null, store.gpuStats.gpu ? 'WebGPU' : 'Canvas2D 回退'),
          h('span', { class: 'sep' }),
          h('span', null, `斜纹 ${(store.gpuStats.hatchStripes / 1000).toFixed(1)}k 条`),
          h('span', { class: 'sep' }),
          h('span', null, `${store.gpuStats.triangles.toFixed(0)} 三角面`),
          h('span', { class: 'sep' }),
          h('span', null, `${store.gpuStats.buildMs.toFixed(1)} ms`),
        ]),
      ]);
  },
});

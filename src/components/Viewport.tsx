import { createEffect, onCleanup, onMount } from 'solid-js';
import { SceneController, type InteractionMode } from '../three/SceneController';
import { modelStore } from '../store/model';
import { evaluated } from '../store/evaluated';
import { faceName } from '../core/geometry';
import { createSignal } from 'solid-js';

export default function Viewport(props: { mode: InteractionMode }) {
  let host: HTMLDivElement | undefined;
  let controller: SceneController;
  const [status, setStatus] = createSignal('');
  const [faceHint, setFaceHint] = createSignal('');

  onMount(() => {
    controller = new SceneController(host!);
    controller.onStatus = (msg) => setStatus(msg);
    controller.onPickFace = (ref) => {
      if (!ref) {
        modelStore.setSelectedFace(null);
        modelStore.setSelectedFeatureId(null);
        setFaceHint('');
        return;
      }
      modelStore.setSelectedFace(ref);
      if (!ref.isCap) modelStore.setSelectedFeatureId(ref.featureId);
      const f = modelStore.model.features.find((x) => x.id === ref.featureId);
      setFaceHint(f ? `${f.name} · ${faceName(f.type, ref.faceId, ref.isCap)}` : '剖切截面');
    };

    createEffect(() => {
      // 追踪版本与选择，变化即重建/重着色
      evaluated();
      controller.syncFromStore();
    });
    createEffect(() => controller.setMode(props.mode));

    // 全局快捷键
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) modelStore.redo();
        else modelStore.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        modelStore.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    onCleanup(() => {
      window.removeEventListener('keydown', onKey);
      controller.dispose();
    });

    // 暴露给父组件工具栏
    (host as unknown as { __controller: SceneController }).__controller = controller;
  });

  return (
    <div class="viewport-wrap">
      <div class="viewport" ref={host!} />
      {modelStore.model.clip.enabled && <div class="clip-badge">剖切平面已启用 · 剖面线 {modelStore.model.clip.showHatch ? '开' : '关'}</div>}
      <div class="statusbar">
        <span>{status() || '左键旋转 · 右键平移 · 滚轮缩放 · 点选面后可改尺寸'}</span>
        <span style={{ flex: 1 }} />
        {faceHint() && <span>当前面：{faceHint()}</span>}
        <span>
          捕捉：
          <button
            style={{ padding: '1px 8px', 'font-size': '11px' }}
            classList={{ toggled: modelStore.snappingEnabled() }}
            onClick={() => modelStore.setSnappingEnabled(!modelStore.snappingEnabled())}
          >
            {modelStore.snappingEnabled() ? '开启' : '关闭'}
          </button>
        </span>
        <button
          style={{ padding: '1px 8px', 'font-size': '11px' }}
          onClick={() => (host as unknown as { __controller: SceneController }).__controller.frameAll()}
        >
          全屏居中
        </button>
      </div>
    </div>
  );
}

import { createSignal, onCleanup } from 'solid-js';
import * as THREE from 'three';
import { generateThreeViewSVG, type ThreeViewResult } from '../three/orthographic';
import { evaluated } from '../store/evaluated';

export default function ThreeViewModal(props: { onClose: () => void }) {
  const [result, setResult] = createSignal<ThreeViewResult | null>(null);
  const [error, setError] = createSignal('');

  // 离屏 WebGL2 渲染器，仅用于正交深度判定，不干扰建模视口
  const off = document.createElement('canvas');
  off.width = off.height = 1024;
  const renderer = new THREE.WebGLRenderer({ canvas: off, antialias: false, preserveDrawingBuffer: true });
  const scene = new THREE.Scene();

  try {
    if (evaluated().result.empty) {
      setError('当前模型为空，请先添加体块并完成布尔运算。');
    } else {
      setResult(generateThreeViewSVG(renderer, scene));
    }
  } catch (e) {
    setError(`三视图生成失败：${(e as Error).message}`);
  }

  onCleanup(() => {
    renderer.dispose();
  });

  const download = () => {
    const r = result();
    if (!r) return;
    const blob = new Blob([r.svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `三视图_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div class="modal-backdrop" onClick={(e) => e.target === e.currentTarget && props.onClose()}>
      <div class="modal" style={{ width: 'min(960px, 94vw)' }}>
        <h2>三视图线稿（第一角画法）</h2>
        {error() && <p style={{ color: 'var(--danger)' }}>{error()}</p>}
        {result() && (
          <>
            <div class="row" style={{ 'margin-bottom': '10px', 'flex-wrap': 'wrap' }}>
              {result()!.views.map((v) => (
                <span class="pill">
                  {v.title}：可见线 {v.edgeCount} · 隐藏线 {v.hiddenCount}
                  {v.capCount > 0 ? ` · 剖面三角面 ${v.capCount}` : ''}
                </span>
              ))}
            </div>
            <div class="svgsheet" innerHTML={result()!.svg} />
            <div class="actions">
              <button onClick={props.onClose}>关闭</button>
              <button class="primary" onClick={download}>导出 SVG 线稿</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

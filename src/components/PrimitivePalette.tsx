import type { JSX } from 'solid-js';
import type { PrimitiveType } from '../core/types';
import { setDraggedPrimitive } from '../three/SceneController';

function BoxIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="#2f7de1" stroke-width="2">
      <path d="M24 6 L42 15 L42 33 L24 42 L6 33 L6 15 Z" fill="#e4efff" />
      <path d="M6 15 L24 24 L42 15" />
      <path d="M24 24 L24 42" />
    </svg>
  );
}
function CylinderIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="#2f7de1" stroke-width="2">
      <ellipse cx="24" cy="11" rx="15" ry="6" fill="#e4efff" />
      <path d="M9 11 L9 37" />
      <path d="M39 11 L39 37" />
      <path d="M9 37 C9 40.3 15.7 43 24 43 C32.3 43 39 40.3 39 37" fill="#e4efff" />
      <ellipse cx="24" cy="37" rx="15" ry="6" stroke-dasharray="3 3" opacity="0.5" />
    </svg>
  );
}
function FrustumIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="#2f7de1" stroke-width="2">
      <path d="M14 38 L34 38 L29 12 L19 12 Z" fill="#e4efff" />
      <path d="M19 12 L29 12" />
      <path d="M14 38 L34 38" />
      <path d="M14 38 L9 42 L39 42 L34 38" opacity="0.6" />
      <path d="M19 12 L16.5 8 L31.5 8 L29 12" opacity="0.6" />
    </svg>
  );
}

const ITEMS: { type: PrimitiveType; name: string; hint: string; Icon: () => JSX.Element }[] = [
  { type: 'box', name: '长方体', hint: '三轴尺寸可改', Icon: BoxIcon },
  { type: 'cylinder', name: '圆柱', hint: '半径 / 高度', Icon: CylinderIcon },
  { type: 'frustum', name: '棱台', hint: '四棱台 / 圆台', Icon: FrustumIcon },
];

export default function PrimitivePalette() {
  const onDragStart = (type: PrimitiveType, e: DragEvent) => {
    setDraggedPrimitive(type);
    e.dataTransfer?.setData('application/x-mc3d-primitive', type);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
  };
  return (
    <div>
      {ITEMS.map(({ type, name, hint, Icon }) => (
        <div
          class="palette-item"
          draggable="true"
          onDragStart={(e) => onDragStart(type, e)}
          onDragEnd={() => setDraggedPrimitive(null)}
          title={`拖入视口添加${name}`}
        >
          <Icon />
          <div class="name">{name}</div>
          <div class="hint">{hint}</div>
        </div>
      ))}
      <p class="muted" style={{ 'font-size': '11px', 'line-height': '1.6' }}>
        操作方式：将体块拖入右侧视口放置到地面；在特征列表切换并/差/交运算；
        使用顶部工具进入「移动 / 改尺寸 / 剖切」模式。
      </p>
    </div>
  );
}

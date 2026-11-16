import { createMemo, createSignal } from 'solid-js';
import { modelStore } from '../store/model';
import { evaluated } from '../store/evaluated';
import { dimensionForFace, faceName, resizeByFace } from '../core/geometry';
import type { BoxDims, CylinderDims, Dims, Feature, FrustumDims, Vec3Tuple } from '../core/types';

function NumberField(props: {
  label: string;
  value: number;
  step?: number;
  onCommit: (v: number) => void;
}) {
  const [v, setV] = createSignal(String(props.value));
  // 外部值变化（撤销/重做/拖动）时同步
  createMemo(() => setV(String(props.value)));
  return (
    <label class="field">
      <span>{props.label}</span>
      <input
        type="number"
        step={props.step ?? 1}
        value={v()}
        onInput={(e) => setV(e.currentTarget.value)}
        onChange={(e) => {
          const n = parseFloat(e.currentTarget.value);
          if (Number.isFinite(n)) props.onCommit(n);
          else setV(String(props.value));
        }}
      />
    </label>
  );
}

function DimEditor(props: { feature: Feature }) {
  const f = props.feature;
  const patch = (dims: Dims) => modelStore.updateFeature(f.id, { dims });
  const patchPos = (position: Vec3Tuple) => modelStore.updateFeature(f.id, { position });

  return (
    <div>
      <div class="dim-grid">
        {f.type === 'box' &&
          (() => {
            const d = f.dims as BoxDims;
            return (
              <>
                <NumberField label="宽 X (mm)" value={d.width} onCommit={(n) => patch({ ...d, width: n })} />
                <NumberField label="高 Y (mm)" value={d.height} onCommit={(n) => patch({ ...d, height: n })} />
                <NumberField label="深 Z (mm)" value={d.depth} onCommit={(n) => patch({ ...d, depth: n })} />
              </>
            );
          })()}
        {f.type === 'cylinder' &&
          (() => {
            const d = f.dims as CylinderDims;
            return (
              <>
                <NumberField label="半径 R (mm)" value={d.radius} onCommit={(n) => patch({ ...d, radius: n })} />
                <NumberField label="高度 H (mm)" value={d.height} onCommit={(n) => patch({ ...d, height: n })} />
                <NumberField
                  label="圆周分段"
                  value={d.segments}
                  step={4}
                  onCommit={(n) => patch({ ...d, segments: Math.max(8, Math.min(96, Math.round(n))) })}
                />
              </>
            );
          })()}
        {f.type === 'frustum' &&
          (() => {
            const d = f.dims as FrustumDims;
            return (
              <>
                <NumberField label="下底外接 (mm)" value={d.bottom} onCommit={(n) => patch({ ...d, bottom: n })} />
                <NumberField label="上底外接 (mm)" value={d.top} onCommit={(n) => patch({ ...d, top: n })} />
                <NumberField label="高度 H (mm)" value={d.height} onCommit={(n) => patch({ ...d, height: n })} />
                <NumberField
                  label="棱数"
                  value={d.segments}
                  step={1}
                  onCommit={(n) => patch({ ...d, segments: Math.max(3, Math.min(32, Math.round(n))) })}
                />
              </>
            );
          })()}
      </div>
      <h3>位置（体块中心）</h3>
      <div class="dim-grid">
        <NumberField label="X (mm)" value={f.position[0]} onCommit={(n) => patchPos([n, f.position[1], f.position[2]])} />
        <NumberField label="Y (mm)" value={f.position[1]} onCommit={(n) => patchPos([f.position[0], n, f.position[2]])} />
        <NumberField label="Z (mm)" value={f.position[2]} onCommit={(n) => patchPos([f.position[0], f.position[1], n])} />
      </div>
    </div>
  );
}

function FaceSection() {
  const face = modelStore.selectedFace;
  const feature = createMemo(() => {
    if (!face()) return null;
    return modelStore.model.features.find((f) => f.id === face()!.featureId) ?? null;
  });

  if (!face()) {
    return (
      <p class="muted">
        在视口中点击实体表面选择面。选中后可查看面归属、直接输入尺寸，
        或切换到顶部「改尺寸」模式沿法线拖拽。
      </p>
    );
  }
  const ref = face()!;
  const f = feature();
  if (ref.isCap || !f) {
    return (
      <div class="face-info">
        <div class="title">{ref.isCap ? '剖切截面' : '未知面'}</div>
        <div class="muted">
          {ref.isCap
            ? '这是剖切产生的截面，带有剖面线。截面形状由剖切平面与实体相交得到，不能直接改尺寸；可在下方调整剖切平面。'
            : '该面来自已删除的特征。'}
        </div>
      </div>
    );
  }

  const handle = dimensionForFace(f, ref.faceId);
  const applyFaceDelta = (delta: number) => {
    const next = resizeByFace(f, ref.faceId, delta);
    modelStore.updateFeature(f.id, { dims: next.dims, position: next.position });
  };

  return (
    <div class="face-info">
      <div class="title">
        已选面：{f.name} · {faceName(f.type, ref.faceId, false)}
      </div>
      {handle && (
        <>
          <div class="muted" style={{ margin: '4px 0 8px' }}>
            该面驱动尺寸：<b>{handle.label}</b>（沿面外法线正向为增大）
          </div>
          <div class="row">
            <button onClick={() => applyFaceDelta(-1)}>−1 mm</button>
            <button onClick={() => applyFaceDelta(1)}>+1 mm</button>
            <button onClick={() => applyFaceDelta(-10)}>−10</button>
            <button onClick={() => applyFaceDelta(10)}>+10</button>
          </div>
        </>
      )}
    </div>
  );
}

function ClipPanel() {
  const clip = modelStore.model.clip;
  const set = (patch: Partial<typeof clip>) => modelStore.setClip(patch);
  const normals: { label: string; n: Vec3Tuple }[] = [
    { label: '俯视剖切（法线 −Y）', n: [0, -1, 0] },
    { label: '前视剖切（法线 −Z）', n: [0, 0, -1] },
    { label: '侧视剖切（法线 +X）', n: [1, 0, 0] },
  ];

  return (
    <div>
      <label class="field">
        <span>
          <input
            type="checkbox"
            checked={clip.enabled}
            style={{ width: 'auto', 'margin-right': '6px' }}
            onChange={(e) => set({ enabled: e.currentTarget.checked })}
          />
          启用剖切平面
        </span>
      </label>
      <label class="field">
        <span>预设法线方向</span>
        <select
          value={JSON.stringify(clip.normal)}
          onChange={(e) => set({ normal: JSON.parse(e.currentTarget.value) as Vec3Tuple })}
        >
          {normals.map((o) => (
            <option value={JSON.stringify(o.n)}>{o.label}</option>
          ))}
        </select>
      </label>
      <div class="dim-grid">
        <NumberField label="平面过点 X" value={clip.point[0]} onCommit={(n) => set({ point: [n, clip.point[1], clip.point[2]] })} />
        <NumberField label="平面过点 Y" value={clip.point[1]} onCommit={(n) => set({ point: [clip.point[0], n, clip.point[2]] })} />
        <NumberField label="平面过点 Z" value={clip.point[2]} onCommit={(n) => set({ point: [clip.point[0], clip.point[1], n] })} />
        <NumberField
          label="剖面线间距 (mm)"
          value={clip.hatchGap}
          onCommit={(n) => set({ hatchGap: Math.max(1, n) })}
        />
      </div>
      <label class="field">
        <span>
          <input
            type="checkbox"
            checked={clip.showHatch}
            style={{ width: 'auto', 'margin-right': '6px' }}
            onChange={(e) => set({ showHatch: e.currentTarget.checked })}
          />
          剖面线填充
        </span>
      </label>
      <p class="muted" style={{ 'font-size': '11px' }}>
        提示：顶部「剖切」模式下可在视口中直接拖动平面；剖切面在三视图中自动输出 45° 剖面线。
      </p>
    </div>
  );
}

export default function Inspector() {
  const selectedId = modelStore.selectedFeatureId;
  const feature = createMemo(() => modelStore.model.features.find((f) => f.id === selectedId()) ?? null);
  const entry = createMemo(() => evaluated());

  return (
    <div>
      <h3>面选择与改尺寸</h3>
      <FaceSection />

      <h3>体积（自动计算）</h3>
      <div class="card" style={{ padding: '10px' }}>
        <div style={{ 'font-size': '20px', 'font-weight': 700 }}>
          {entry().result.empty ? '—' : entry().result.volume.toFixed(1)}
          <span class="muted" style={{ 'font-size': '12px', 'font-weight': 400 }}> mm³</span>
        </div>
        <div class="muted" style={{ 'font-size': '11px' }}>布尔运算后实体的精确网格体积</div>
      </div>

      <h3>特征参数</h3>
      {feature() ? (
        <DimEditor feature={feature()!} />
      ) : (
        <p class="muted">在左侧特征列表或视口中选择一个体块以编辑参数。</p>
      )}

      <h3>剖切平面</h3>
      <ClipPanel />
    </div>
  );
}

import type { DoorInfo, EquipmentInfo, MineDataset, PipelineInfo, Roadway } from '../core/types';
import { LAYER_META, PIPELINE_KIND_LABEL, PURPOSE_LABEL } from '../core/types';

interface Props {
  roadway: Roadway;
  dataset: MineDataset;
  onClose: () => void;
  onFrame: (rw: Roadway) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-section">
      <div className="card-section-title">{title}</div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="card-row">
      <span className="card-key">{k}</span>
      <span className="card-val">{v}</span>
    </div>
  );
}

export function PropertyCard({ roadway, dataset, onClose, onFrame }: Props) {
  const pipes = dataset.pipelines.filter((p) => p.roadwayId === roadway.id);
  const doors = dataset.doors.filter((d) => d.roadwayId === roadway.id);
  const eqs = dataset.equipment.filter((e) => e.roadwayId === roadway.id);
  const secName = roadway.section.type === 'arch' ? '直墙半圆拱' : roadway.section.type === 'rect' ? '矩形' : '圆形';

  return (
    <div className="property-card">
      <div className="card-header">
        <div>
          <div className="card-title">{roadway.name}</div>
          <div className="card-sub">
            {roadway.id}
            {roadway.diffStatus !== 'common' && (
              <span className={`badge diff-${roadway.diffStatus}`}>
                {roadway.diffStatus === 'new' ? '二期新增' : '一期废弃'}
              </span>
            )}
          </div>
        </div>
        <button className="icon-btn" onClick={onClose} title="关闭">✕</button>
      </div>

      <Section title="基本属性">
        <Row k="所属采区" v={roadway.district} />
        <Row k="巷道用途" v={PURPOSE_LABEL[roadway.purpose]} />
        <Row k="建成年份" v={roadway.buildYear} />
        <Row k="累计长度" v={`${roadway.length.toLocaleString()} m`} />
        <Row k="标高区间" v={`${roadway.levelMin.toFixed(1)} ~ ${roadway.levelMax.toFixed(1)} m`} />
        <Row k="测量点数" v={roadway.centerline.length} />
      </Section>

      <Section title="断面参数">
        <Row k="断面形式" v={secName} />
        <Row k="净宽 × 净高" v={`${roadway.section.width} × ${roadway.section.height} m`} />
        {roadway.section.radius != null && <Row k="拱半径" v={`${roadway.section.radius.toFixed(2)} m`} />}
        <Row k="支护间距" v={`${roadway.supportSpacing.toFixed(1)} m / 架`} />
      </Section>

      <Section title={`附属设施（${LAYER_META.pipeline.name} ${pipes.length}）`}>
        {pipes.length === 0 && <div className="empty-hint">无管线</div>}
        {pipes.map((p: PipelineInfo) => (
          <Row key={p.id} k={PIPELINE_KIND_LABEL[p.kind]} v={`Ø${(p.radius * 2).toFixed(2)} m · 吊挂高 ${p.height.toFixed(1)} m`} />
        ))}
      </Section>

      <Section title={`${LAYER_META.door.name}（${doors.length}）`}>
        {doors.length === 0 && <div className="empty-hint">无风门</div>}
        {doors.map((d: DoorInfo) => (
          <Row key={d.id} k={d.kind} v={`${d.size[0]} × ${d.size[1]} m`} />
        ))}
      </Section>

      <Section title={`${LAYER_META.equipment.name}（${eqs.length}）`}>
        {eqs.length === 0 && <div className="empty-hint">无机电设备</div>}
        {eqs.map((e: EquipmentInfo) => (
          <Row key={e.id} k={e.kind} v={`${e.power} kW · ${e.size.map((s) => s.toFixed(1)).join('×')} m`} />
        ))}
      </Section>

      <div className="card-actions">
        <button className="btn primary" onClick={() => onFrame(roadway)}>定位镜头</button>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { archiveStore } from '../core/archive';
import type { DiffReport, DrawingVersion, MeasurementArchive, MineDataset, Roadway } from '../core/types';

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  raw: { text: '原始待加工', cls: 'st-raw' },
  processed: { text: '已加工', cls: 'st-processed' },
  archived: { text: '已归档', cls: 'st-archived' },
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

interface Props {
  datasets: MineDataset[];
  onRegister: (ds: MineDataset, fileName: string) => void;
  onProcess: (arch: MeasurementArchive) => void;
  onArchive: (versionId: string) => void;
  onRunDiff: (from: DrawingVersion, to: DrawingVersion) => DiffReport | undefined;
  onSearchResult: (rws: Roadway[], keyword: string) => void;
}

export function ArchivePanel(props: Props) {
  const [tab, setTab] = useState<'archive' | 'version' | 'diff' | 'search'>('archive');
  const [search, setSearch] = useState({ name: '', district: '', levelMin: '', levelMax: '' });
  const [diffPick, setDiffPick] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [lastReport, setLastReport] = useState<DiffReport | null>(null);

  const archives = archiveStore.archives;
  const versions = archiveStore.versions;
  const reports = archiveStore.reports;
  const districts = useMemo(
    () => Array.from(new Set(props.datasets.flatMap((d) => d.roadways.map((r) => r.district)))).sort(),
    [props.datasets],
  );

  const runSearch = () => {
    const ds = props.datasets[1] ?? props.datasets[0];
    const rws = archiveStore.searchRoadways(ds, {
      name: search.name || undefined,
      district: search.district || undefined,
      levelMin: search.levelMin === '' ? undefined : Number(search.levelMin),
      levelMax: search.levelMax === '' ? undefined : Number(search.levelMax),
    });
    props.onSearchResult(rws, [search.name, search.district, search.levelMin, search.levelMax].filter(Boolean).join(' / ') || '全部归档巷道');
  };

  return (
    <div className="panel archive-panel">
      <div className="tab-bar">
        {([
          ['archive', '测量建档'],
          ['version', '图档版本'],
          ['diff', '差异报告'],
          ['search', '归档检索'],
        ] as const).map(([k, label]) => (
          <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'archive' && (
        <div className="tab-body">
          <div className="panel-tip">原始测量文件（中心线/断面参数）先建档编号，再进入加工流程。</div>
          {props.datasets.map((ds) => (
            <div key={ds.period} className="arch-file">
              <div>
                <b>survey_period{ds.period}.dat</b>
                <div className="muted">
                  {ds.label} · {ds.roadways.length} 条巷道 · {ds.totalLength.toLocaleString()} m ·{' '}
                  {ds.roadways.reduce((n, r) => n + r.centerline.length, 0)} 个测量点
                </div>
              </div>
              <button className="btn small" onClick={() => props.onRegister(ds, `survey_period${ds.period}.dat`)}>
                建档编号
              </button>
            </div>
          ))}
          <div className="record-list">
            {archives.map((a) => (
              <div key={a.id} className="record">
                <div>
                  <span className="record-id">{a.id}</span>
                  <span className={`badge ${STATUS_LABEL[a.status].cls}`}>{STATUS_LABEL[a.status].text}</span>
                </div>
                <div className="muted">{a.fileName} · {a.roadwayCount} 巷 / {a.totalLength.toLocaleString()} m</div>
                <div className="muted tiny">{fmtTime(a.uploadedAt)}</div>
                {a.status === 'raw' && (
                  <button className="btn small primary" onClick={() => props.onProcess(a)}>
                    加工为图档版本
                  </button>
                )}
              </div>
            ))}
            {archives.length === 0 && <div className="empty-hint">暂无档案，点击上方"建档编号"入库。</div>}
          </div>
        </div>
      )}

      {tab === 'version' && (
        <div className="tab-body">
          <div className="record-list">
            {versions.map((v) => (
              <div key={v.id} className="record">
                <div>
                  <span className="record-id">{v.id}</span>
                  <span className="muted">{v.version}</span>
                  <span className={`badge ${STATUS_LABEL[v.status].cls}`}>{STATUS_LABEL[v.status].text}</span>
                </div>
                <div className="muted">来源 {v.basedOn} · {v.roadwayCount} 巷 / {v.totalLength.toLocaleString()} m</div>
                <div className="muted tiny">{v.note} · {fmtTime(v.createdAt)}</div>
                {v.status !== 'archived' && (
                  <button className="btn small" onClick={() => props.onArchive(v.id)}>归档</button>
                )}
              </div>
            ))}
            {versions.length === 0 && <div className="empty-hint">暂无图档版本，请先在"测量建档"中加工。</div>}
          </div>
        </div>
      )}

      {tab === 'diff' && (
        <div className="tab-body">
          <div className="diff-pick">
            <select value={diffPick.from} onChange={(e) => setDiffPick({ ...diffPick, from: e.target.value })}>
              <option value="">选择基准版本</option>
              {versions.map((v) => <option key={v.id} value={v.id}>{v.id} ({v.version})</option>)}
            </select>
            <span className="diff-arrow">→</span>
            <select value={diffPick.to} onChange={(e) => setDiffPick({ ...diffPick, to: e.target.value })}>
              <option value="">选择对比版本</option>
              {versions.map((v) => <option key={v.id} value={v.id}>{v.id} ({v.version})</option>)}
            </select>
          </div>
          <button
            className="btn primary full"
            disabled={!diffPick.from || !diffPick.to || diffPick.from === diffPick.to}
            onClick={() => {
              const f = versions.find((v) => v.id === diffPick.from)!;
              const t = versions.find((v) => v.id === diffPick.to)!;
              const r = props.onRunDiff(f, t);
              if (r) setLastReport(r);
            }}
          >
            执行版本比对
          </button>
          {lastReport && (
            <div className="diff-summary">
              <div className="record-id">{lastReport.id}</div>
              <div className="diff-chips">
                <span className="chip added">新增 {lastReport.summary.added}</span>
                <span className="chip removed">废弃 {lastReport.summary.removed}</span>
                <span className="chip geometry">几何变更 {lastReport.summary.geometry}</span>
                <span className="chip meta">属性变更 {lastReport.summary.meta}</span>
                <span className="chip unchanged">无变化 {lastReport.summary.unchanged}</span>
              </div>
              <div className="muted">长度净变化：<b className={lastReport.lengthDelta >= 0 ? 'pos' : 'neg'}>
                {lastReport.lengthDelta >= 0 ? '+' : ''}{lastReport.lengthDelta.toLocaleString()} m
              </b></div>
              <div className="diff-entries">
                {lastReport.entries.filter((e) => e.change !== 'unchanged').map((e) => (
                  <div key={e.roadwayId} className={`diff-entry ${e.change}`}>
                    <span className={`chip ${e.change}`}>{e.change}</span>
                    <span>{e.name}</span>
                    <span className="muted tiny">{e.detail}{e.lengthDelta != null ? `（${e.lengthDelta >= 0 ? '+' : ''}${e.lengthDelta} m）` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!lastReport && reports.length > 0 && (
            <div className="record-list">
              {reports.slice(0, 5).map((r) => (
                <div key={r.id} className="record" onClick={() => setLastReport(r)} style={{ cursor: 'pointer' }}>
                  <span className="record-id">{r.id}</span>
                  <span className="muted">{r.fromVersion} → {r.toVersion}</span>
                  <span className="muted tiny">{fmtTime(r.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'search' && (
        <div className="tab-body">
          <div className="panel-tip">在已归档图档范围内，按巷道名、标高区间、采区检索。</div>
          <input className="field" placeholder="巷道名关键字，如 运输01" value={search.name}
            onChange={(e) => setSearch({ ...search, name: e.target.value })} />
          <select className="field" value={search.district} onChange={(e) => setSearch({ ...search, district: e.target.value })}>
            <option value="">全部采区</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <div className="range-row">
            <input className="field" type="number" placeholder="标高下限 m" value={search.levelMin}
              onChange={(e) => setSearch({ ...search, levelMin: e.target.value })} />
            <span>~</span>
            <input className="field" type="number" placeholder="标高上限 m" value={search.levelMax}
              onChange={(e) => setSearch({ ...search, levelMax: e.target.value })} />
          </div>
          <button className="btn primary full" onClick={runSearch}>检索并在视口定位</button>
        </div>
      )}
    </div>
  );
}

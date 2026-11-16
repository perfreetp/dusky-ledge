import { useEffect, useMemo, useRef, useState } from 'react';
import { generateDataset, generatePeriod2 } from './core/mockData';
import { buildScene, type SceneMeshes } from './core/mesh';
import type { LayerId, MeasurementArchive, Roadway, Vec3 } from './core/types';
import { LAYER_META, LAYER_ORDER, PURPOSE_LABEL } from './core/types';
import type { OrbitState } from './core/math';
import { Viewport3D } from './components/Viewport3D';
import { LayerPanel } from './components/LayerPanel';
import { PropertyCard } from './components/PropertyCard';
import { ClipPanel } from './components/ClipPanel';
import { ArchivePanel } from './components/ArchivePanel';
import type { ClipPlane } from './renderer/WebGPURenderer';
import { archiveStore } from './core/archive';

type ViewMode = 'single' | 'split';

function initialCamera(center: Vec3, radius: number): OrbitState {
  return {
    target: center,
    radius: Math.max(1200, radius * 1.1),
    yaw: Math.PI * 0.25,
    pitch: 0.65,
    fovy: Math.PI / 4,
  };
}

function sceneCenter(scenes: SceneMeshes[]): Vec3 {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const sc of scenes) {
    for (const box of sc.rwAABB) {
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], box.min[i]);
        max[i] = Math.max(max[i], box.max[i]);
      }
    }
  }
  return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
}

export default function App() {
  // —— 两期数据与场景（仅构建一次）——
  const { datasets, scenes } = useMemo(() => {
    const p1 = generateDataset({ period: 1, seed: 0x51a7c0, targetLength: 120000 });
    const p2 = generatePeriod2(p1);
    const datasets = [p1, p2];
    const scenes = [buildScene(p1), buildScene(p2)];
    return { datasets, scenes };
  }, []);

  const center = useMemo(() => sceneCenter(scenes), [scenes]);
  const cam0 = useMemo(() => {
    const span = Math.hypot(
      scenes[0].rwAABB[0]?.max[0] ?? 1,
      scenes[0].rwAABB[0]?.max[1] ?? 1,
    );
    return initialCamera(center, Math.max(2600, span));
  }, [center, scenes]);

  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [activePeriod, setActivePeriod] = useState<1 | 2>(1);
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({
    roadway: true, support: true, pipeline: true, door: true, equipment: true,
  });
  const [solo, setSolo] = useState<LayerId | null>(null);
  const [selected, setSelected] = useState<{ period: 1 | 2; rw: Roadway } | null>(null);
  const [clipEnabled, setClipEnabled] = useState(false);
  const [clipAxis, setClipAxis] = useState<'x' | 'y' | 'z'>('x');
  const [clipProgress, setClipProgress] = useState(0.5);
  const [camSync, setCamSync] = useState<{ cam: OrbitState; nonce: number } | null>(null);
  const [searchHits, setSearchHits] = useState<Roadway[] | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [, forceTick] = useState(0);
  const mainCamRef = useRef<OrbitState>(cam0);

  useEffect(() => archiveStore.subscribe(() => { forceTick((n) => n + 1); }), []);

  // 剖切面：轴对齐、随进度在全局包围盒内移动
  const clipPlane: ClipPlane = useMemo(() => {
    const axisIdx = { x: 0, y: 1, z: 2 }[clipAxis];
    const normal: Vec3 = [0, 0, 0];
    normal[axisIdx] = 1;
    const bounds = datasets.reduce(
      (acc, ds) => {
        for (let i = 0; i < 3; i++) {
          acc.min[i] = Math.min(acc.min[i], ds.bounds.min[i]);
          acc.max[i] = Math.max(acc.max[i], ds.bounds.max[i]);
        }
        return acc;
      },
      { min: [Infinity, Infinity, Infinity] as Vec3, max: [-Infinity, -Infinity, -Infinity] as Vec3 },
    );
    const pos = bounds.min[axisIdx] + (bounds.max[axisIdx] - bounds.min[axisIdx]) * clipProgress;
    return { normal, d: -pos };
  }, [clipAxis, clipProgress, datasets]);

  // 两期差异着色：二期视角给新增/改造巷道绿色，一期视角给废弃巷道红色
  const buildDiffTint = (period: 1 | 2): Record<number, 'new' | 'abandoned' | null> => {
    const map: Record<number, 'new' | 'abandoned' | null> = {};
    const sc = scenes[period - 1];
    sc.rwList.forEach((rw, id) => {
      if (period === 2 && rw.diffStatus === 'new') map[id] = 'new';
      else if (period === 1) {
        const stillExists = datasets[1].roadways.some((r) => r.id === rw.id);
        if (!stillExists) map[id] = 'abandoned';
      }
    });
    return map;
  };
  const diffTint1 = useMemo(() => buildDiffTint(1), [scenes, datasets]); // eslint-disable-line
  const diffTint2 = useMemo(() => buildDiffTint(2), [scenes, datasets]); // eslint-disable-line

  const highlightId = selected
    ? scenes[selected.period - 1].rwIndex.get(selected.rw.id) ?? null
    : null;

  const toggleLayer = (id: LayerId) => {
    if (solo) {
      setSolo(null);
      setLayers((prev) => ({ ...prev, [id]: true }));
    } else {
      setLayers((prev) => ({ ...prev, [id]: !prev[id] }));
    }
  };

  const handlePick = (period: 1 | 2) => (rw: Roadway | null) => {
    setSelected(rw ? { period, rw } : null);
  };

  const frameRoadway = (rw: Roadway) => {
    const sc = scenes[activePeriod - 1];
    const id = sc.rwIndex.get(rw.id);
    if (id == null) return;
    const box = sc.rwAABB[id];
    const radius = Math.max(
      60,
      Math.hypot(box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]) * 1.4,
    );
    setCamSync({ cam: { ...cam0, target: box.center, radius, pitch: 0.5, yaw: Math.PI * 0.25 }, nonce: Date.now() });
    setSelected({ period: activePeriod, rw });
  };

  // —— 档案动作 ——
  const handleRegister = (ds: (typeof datasets)[number], fileName: string) => {
    archiveStore.registerMeasurement(fileName, ds, `模拟测量导入：${ds.label}`);
  };
  const handleProcess = (arch: MeasurementArchive) => {
    const ds = datasets.find((d) => d.period === arch.period)!;
    archiveStore.createVersion(arch.id, ds, `按断面参数扫掠生成体块，五图层加工`);
  };
  const handleRunDiff = (fromId: string, toId: string) => {
    const f = archiveStore.versions.find((v) => v.id === fromId);
    const t = archiveStore.versions.find((v) => v.id === toId);
    if (!f || !t) return undefined;
    return archiveStore.diffVersions(f, t, datasets.find((d) => d.period === f.period)!, datasets.find((d) => d.period === t.period)!);
  };
  const handleSearch = (rws: Roadway[], keyword: string) => {
    setSearchHits(rws);
    setSearchKeyword(keyword);
    if (rws.length) frameRoadway(rws[0]);
  };

  const totalLen = datasets.reduce((s, d) => s + d.totalLength, 0);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">⛏</span>
          <div>
            <h1>矿井巷道三维图档渲染与档案加工平台</h1>
            <div className="subtitle">React 18 + WebGPU/WGSL · 中心线扫掠建模 · 视锥裁剪 · LOD · 档案版本管理</div>
          </div>
        </div>
        <div className="header-meta">
          <div><b>{datasets[0].roadways.length + datasets[1].roadways.length}</b> 条巷道</div>
          <div><b>{(totalLen / 10000).toFixed(2)}</b> 万米总长</div>
          <div className="view-switch">
            <button className={viewMode === 'single' ? 'active' : ''} onClick={() => setViewMode('single')}>单视口</button>
            <button className={viewMode === 'split' ? 'active' : ''} onClick={() => setViewMode('split')}>两期分屏</button>
          </div>
        </div>
      </header>

      <div className="main-layout">
        <aside className="sidebar">
          {viewMode === 'single' && (
            <div className="period-switch">
              {([1, 2] as const).map((p) => (
                <button key={p} className={activePeriod === p ? 'active' : ''} onClick={() => setActivePeriod(p)}>
                  {datasets[p - 1].label}
                </button>
              ))}
            </div>
          )}
          <LayerPanel enabled={layers} solo={solo} onToggle={toggleLayer} onSolo={setSolo} />
          <ClipPanel
            enabled={clipEnabled}
            progress={clipProgress}
            axis={clipAxis}
            datasets={datasets}
            plane={clipPlane}
            onToggle={setClipEnabled}
            onProgress={setClipProgress}
            onAxis={setClipAxis}
          />
          <ArchivePanel
            datasets={datasets}
            onRegister={handleRegister}
            onProcess={handleProcess}
            onArchive={(id) => archiveStore.archive(id)}
            onRunDiff={(f, t) => handleRunDiff(f.id, t.id)}
            onSearchResult={handleSearch}
          />
        </aside>

        <main className={`viewport-area ${viewMode === 'split' ? 'split' : ''}`}>
          {viewMode === 'single' ? (
            <>
              <Viewport3D
                key={activePeriod}
                scene={scenes[activePeriod - 1]}
                initialCamera={cam0}
                layers={layers}
                solo={solo}
                highlightRwId={highlightId}
                clip={{ enabled: clipEnabled, plane: clipPlane }}
                diffTint={activePeriod === 1 ? diffTint1 : diffTint2}
                cameraSync={camSync}
                onCameraChange={(c) => { mainCamRef.current = c; }}
                onPick={handlePick(activePeriod)}
                showStats
                label={datasets[activePeriod - 1].label}
              />
              <Legend />
            </>
          ) : (
            <>
              <Viewport3D
                scene={scenes[0]}
                initialCamera={cam0}
                layers={layers}
                solo={solo}
                highlightRwId={selected?.period === 1 ? highlightId : null}
                clip={{ enabled: clipEnabled, plane: clipPlane }}
                diffTint={diffTint1}
                cameraSync={camSync}
                onCameraChange={(c) => setCamSync({ cam: c, nonce: Date.now() })}
                onPick={handlePick(1)}
                showStats
                label={`${datasets[0].label}（红色=二期废弃段）`}
              />
              <div className="split-divider" />
              <Viewport3D
                scene={scenes[1]}
                initialCamera={cam0}
                layers={layers}
                solo={solo}
                highlightRwId={selected?.period === 2 ? highlightId : null}
                clip={{ enabled: clipEnabled, plane: clipPlane }}
                diffTint={diffTint2}
                cameraSync={camSync}
                onCameraChange={(c) => setCamSync({ cam: c, nonce: Date.now() })}
                onPick={handlePick(2)}
                showStats
                label={`${datasets[1].label}（绿色=本期新增/改造段）`}
              />
            </>
          )}

          {selected && (
            <PropertyCard
              roadway={selected.rw}
              dataset={datasets[selected.period - 1]}
              onClose={() => setSelected(null)}
              onFrame={frameRoadway}
            />
          )}

          {searchHits && (
            <div className="search-hits">
              <div className="search-hits-head">
                检索“{searchKeyword}”命中 <b>{searchHits.length}</b> 条
                <button className="icon-btn" onClick={() => setSearchHits(null)}>✕</button>
              </div>
              <div className="search-hits-body">
                {searchHits.slice(0, 50).map((rw) => (
                  <div key={rw.id} className="search-hit" onClick={() => frameRoadway(rw)}>
                    <span>{rw.name}</span>
                    <span className="muted tiny">
                      {rw.district} · {PURPOSE_LABEL[rw.purpose]} · {rw.levelMin.toFixed(0)}~{rw.levelMax.toFixed(0)}m · {rw.length}m
                    </span>
                  </div>
                ))}
                {searchHits.length > 50 && <div className="muted tiny">仅显示前 50 条</div>}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="legend">
      {LAYER_ORDER.map((id) => (
        <div key={id} className="legend-item">
          <span className="layer-swatch" style={{ background: LAYER_META[id].color }} />
          {LAYER_META[id].name}
        </div>
      ))}
      <div className="legend-item"><span className="layer-swatch" style={{ background: '#33e65a' }} />新增/改造</div>
      <div className="legend-item"><span className="layer-swatch" style={{ background: '#f24d40' }} />废弃段</div>
    </div>
  );
}

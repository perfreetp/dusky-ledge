import { useEffect, useMemo, useRef, useState } from 'react';
import BoothView from './BoothView';
import {
  AMBIENTS, LIGHT_TYPES, ROLES, STATUS, MAX_LIGHTS,
  computeZoneStats, makeLight, makeProject, makeShot, seedProjects,
  daysLeft, datePlus, uid, CAM_PRESETS,
} from './model';

const LS_KEY = 'booth-lighting-projects-v1';

function loadProjects() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return seedProjects();
}

function download(filename, content, mime = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function App() {
  const [projects, setProjects] = useState(loadProjects);
  const [projectId, setProjectId] = useState(null);
  const [shotId, setShotId] = useState(null);
  const [role, setRole] = useState('maker');
  const [timeOfDay, setTimeOfDay] = useState('night');
  const [shadowsOn, setShadowsOn] = useState(true);
  const [threshold, setThreshold] = useState(150);
  const [selectedLightId, setSelectedLightId] = useState(null);
  const [tab, setTab] = useState('lights');
  const viewRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(projects));
  }, [projects]);

  const project = projects.find((p) => p.id === projectId) || projects[0];
  const shot = project?.shots.find((s) => s.id === shotId) || project?.shots[0];
  const scheme = shot?.schemes[shot.activeScheme];
  const lights = scheme?.lights || [];
  const ambient = AMBIENTS[timeOfDay];
  const editable = role === 'maker' && (project?.status === 'making' || project?.status === 'rejected');

  // ---------- 状态更新 ----------
  const updateProject = (id, fn) =>
    setProjects((ps) => ps.map((p) => (p.id === id ? fn(structuredClone(p)) : p)));
  const updateShot = (fn) =>
    updateProject(project.id, (p) => { fn(p.shots.find((s) => s.id === shot.id)); return p; });
  const updateLights = (fn) =>
    updateShot((s) => { fn(s.schemes[s.activeScheme].lights); });

  const selectedLight = lights.find((l) => l.id === selectedLightId);

  // ---------- 统计 ----------
  const stats = useMemo(
    () => (shot ? computeZoneStats(lights, ambient, shadowsOn, threshold) : null),
    [lights, ambient, shadowsOn, threshold, shot]
  );
  const statsB = useMemo(() => {
    if (!shot?.schemes.B) return null;
    return computeZoneStats(shot.schemes.B.lights, ambient, shadowsOn, threshold);
  }, [shot, ambient, shadowsOn, threshold]);

  if (!project || !shot) return <div className="empty">暂无项目, 请客户角色下单创建</div>;

  // ---------- 工作流 ----------
  const submitReview = () => updateProject(project.id, (p) => { p.status = 'review'; return p; });
  const approve = () => updateProject(project.id, (p) => { p.status = 'done'; return p; });
  const reject = () => updateProject(project.id, (p) => { p.status = 'rejected'; p.rework += 1; return p; });

  // ---------- 导出 ----------
  const exportPNG = () => {
    const url = viewRef.current?.getPNG();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}-${shot.name}-布光图.png`;
    a.click();
  };

  const buildCSV = () => {
    const rows = [['镜头', '方案', '灯名', '类型', 'X(m)', 'Z(m)', '高度(m)', '瞄准X', '瞄准Z', '色温(K)', '亮度(%)', '角度(°)', '开关']];
    for (const s of project.shots) {
      for (const key of ['A', 'B']) {
        const sc = s.schemes[key];
        if (!sc) continue;
        for (const L of sc.lights) {
          rows.push([s.name, key, L.name, LIGHT_TYPES[L.type].label, L.x.toFixed(2), L.z.toFixed(2), L.h.toFixed(2),
            L.aimX.toFixed(2), L.aimZ.toFixed(2), L.temp, Math.round(L.intensity * 100), L.angle, L.on ? '开' : '关']);
        }
      }
    }
    return '﻿' + rows.map((r) => r.join(',')).join('\n');
  };

  const exportCSV = () => download(`${project.name}-灯位表.csv`, buildCSV(), 'text/csv;charset=utf-8');

  const exportPackage = () => {
    const png = viewRef.current?.getPNG?.() || null;
    const statsAll = {};
    for (const s of project.shots) {
      statsAll[s.name] = {};
      for (const key of ['A', 'B']) {
        const sc = s.schemes[key];
        if (sc) statsAll[s.name][key] = computeZoneStats(sc.lights, ambient, shadowsOn, threshold);
      }
    }
    const pkg = {
      项目: { 名称: project.name, 客户: project.client, 截止时间: project.deadline, 状态: STATUS[project.status].label, 返工次数: project.rework, 创建日期: project.createdAt },
      导出时间: new Date().toISOString(),
      时段: ambient.label, 照度阈值: threshold,
      照度统计: statsAll,
      当前镜头布光图: png,
      灯位表CSV: buildCSV(),
      项目数据: project,
    };
    download(`${project.name}-交付包.json`, JSON.stringify(pkg, null, 2), 'application/json');
  };

  const dl = daysLeft(project.deadline);

  return (
    <div className="app">
      <header>
        <div className="logo">展位布光预览系统</div>
        <label>角色
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>时段
          <select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)}>
            {Object.entries(AMBIENTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <button className={shadowsOn ? 'toggle on' : 'toggle'} onClick={() => setShadowsOn(!shadowsOn)}>
          {shadowsOn ? '阴影: 开' : '阴影: 关(只看光斑)'}
        </button>
        <label>照度阈值(lx)
          <input type="number" value={threshold} min="0" step="10" style={{ width: 64 }}
            onChange={(e) => setThreshold(Number(e.target.value) || 0)} />
        </label>
        <span className="hint">拖拽空白处旋转/俯仰 · 滚轮缩放 · 点击灯选中后拖拽换位</span>
      </header>

      <div className="main">
        {/* 左栏: 项目与流程 */}
        <aside className="left">
          <ProjectList
            projects={projects} projectId={project.id} role={role}
            onSelect={(id) => { setProjectId(id); setShotId(null); setSelectedLightId(null); }}
            onCreate={(name, client, deadline) => {
              const p = makeProject(name, client, deadline);
              setProjects((ps) => [...ps, p]);
              setProjectId(p.id); setShotId(null);
            }}
          />
          <div className="card">
            <div className="card-title">项目状态</div>
            <div className="status-row">
              <span className="badge" style={{ background: STATUS[project.status].color }}>{STATUS[project.status].label}</span>
              <span>返工 <b>{project.rework}</b> 次</span>
            </div>
            <div className={dl < 0 && project.status !== 'done' ? 'deadline overdue' : 'deadline'}>
              截止 {project.deadline}（{dl >= 0 ? `剩 ${dl} 天` : `已超期 ${-dl} 天`}）
            </div>
            {role === 'maker' && (project.status === 'making' || project.status === 'rejected') && (
              <button className="primary" onClick={submitReview}>提交审核</button>
            )}
            {role === 'supervisor' && project.status === 'review' && (
              <div className="btn-row">
                <button className="primary" onClick={approve}>通过并交付</button>
                <button className="danger" onClick={reject}>退回返工</button>
              </div>
            )}
            {project.status === 'done' && (
              <button className="primary" onClick={exportPackage}>下载交付包</button>
            )}
            {role === 'supervisor' && project.status !== 'review' && project.status !== 'done' && (
              <div className="muted">项目未处于待审核状态</div>
            )}
          </div>

          <div className="card">
            <div className="card-title">镜头</div>
            {project.shots.map((s) => (
              <div key={s.id}
                className={s.id === shot.id ? 'shot active' : 'shot'}
                onClick={() => { setShotId(s.id); setSelectedLightId(null); }}>
                {s.name}
                <span className="muted"> · {s.schemes[s.activeScheme].lights.length} 灯</span>
              </div>
            ))}
            {role === 'client' && project.status !== 'done' && (
              <button onClick={() => {
                const name = prompt('镜头名称(主视角/俯视/右侧视角):', '右侧视角');
                if (name) updateProject(project.id, (p) => { p.shots.push(makeShot(name)); return p; });
              }}>+ 添加镜头</button>
            )}
          </div>
        </aside>

        {/* 中间: 三维视图 */}
        <section className="viewport">
          <BoothView
            ref={viewRef}
            key={shot.id}
            lights={lights}
            ambient={ambient}
            shadowsOn={shadowsOn}
            darkZones={stats ? stats.zones.filter((z) => z.dark) : []}
            selectedId={selectedLightId}
            cam={shot.cam}
            onCamChange={(c) => updateShot((s) => { s.cam = c; })}
            onSelectLight={setSelectedLightId}
            onMoveLight={(id, x, z) => editable && updateLights((ls) => {
              const L = ls.find((l) => l.id === id); if (L) { L.x = x; L.z = z; }
            })}
            onMoveAim={(id, x, z) => editable && updateLights((ls) => {
              const L = ls.find((l) => l.id === id); if (L) { L.aimX = x; L.aimZ = z; }
            })}
          />
          {!editable && role === 'maker' && (
            <div className="lock-tip">当前状态为「{STATUS[project.status].label}」, 不可编辑灯光</div>
          )}
        </section>

        {/* 右栏: 面板 */}
        <aside className="right">
          <div className="tabs">
            {[['lights', '灯光'], ['stats', '照度统计'], ['compare', '方案对比'], ['export', '导出']].map(([k, v]) => (
              <button key={k} className={tab === k ? 'tab active' : 'tab'} onClick={() => setTab(k)}>{v}</button>
            ))}
          </div>

          {tab === 'lights' && (
            <LightsPanel
              lights={lights} editable={editable} selectedLight={selectedLight}
              onSelect={setSelectedLightId}
              onAdd={(type) => updateLights((ls) => {
                if (ls.length >= MAX_LIGHTS) return;
                const n = ls.filter((l) => l.type === type).length + 1;
                const L = makeLight(type, 3, 2, `${LIGHT_TYPES[type].label}${n}`);
                ls.push(L);
                setSelectedLightId(L.id);
              })}
              onDelete={(id) => { updateLights((ls) => { const i = ls.findIndex((l) => l.id === id); if (i >= 0) ls.splice(i, 1); }); setSelectedLightId(null); }}
              onChange={(id, patch) => updateLights((ls) => { Object.assign(ls.find((l) => l.id === id), patch); })}
            />
          )}

          {tab === 'stats' && stats && <StatsPanel stats={stats} threshold={threshold} />}

          {tab === 'compare' && (
            <ComparePanel
              shot={shot} statsA={stats} statsB={statsB} editable={editable}
              onSetActive={(key) => updateShot((s) => { s.activeScheme = key; })}
              onSnapshotB={() => updateShot((s) => { s.schemes.B = { lights: structuredClone(s.schemes.A.lights) }; })}
              onClearB={() => updateShot((s) => { s.schemes.B = null; if (s.activeScheme === 'B') s.activeScheme = 'A'; })}
            />
          )}

          {tab === 'export' && (
            <div className="card">
              <div className="card-title">导出</div>
              <button className="primary block" onClick={exportPNG}>导出当前布光图 (PNG)</button>
              <button className="primary block" onClick={exportCSV}>导出灯位表 (CSV)</button>
              <button className="primary block" onClick={exportPackage}>打包交付 (JSON 含图/表/统计)</button>
              <div className="muted" style={{ marginTop: 8 }}>布光图为当前镜头当前方案的渲染结果; 灯位表含全部镜头与方案。</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ProjectList({ projects, projectId, role, onSelect, onCreate }) {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [deadline, setDeadline] = useState(datePlus(14));
  return (
    <div className="card">
      <div className="card-title">项目列表</div>
      {projects.map((p) => (
        <div key={p.id} className={p.id === projectId ? 'proj active' : 'proj'} onClick={() => onSelect(p.id)}>
          <div>{p.name}</div>
          <div className="muted">{p.client} · {STATUS[p.status].label} · 返工{p.rework}次</div>
        </div>
      ))}
      {role === 'client' && (
        <div className="new-proj">
          <input placeholder="项目名称" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="客户" value={client} onChange={(e) => setClient(e.target.value)} />
          <label className="muted">截止时间</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <button className="primary" disabled={!name} onClick={() => { onCreate(name, client || '客户', deadline); setName(''); setClient(''); }}>
            下单建项目
          </button>
        </div>
      )}
    </div>
  );
}

function LightsPanel({ lights, editable, selectedLight, onSelect, onAdd, onDelete, onChange }) {
  return (
    <div>
      <div className="card">
        <div className="card-title">灯具（{lights.length}/{MAX_LIGHTS}）</div>
        {editable && (
          <div className="btn-row">
            {Object.entries(LIGHT_TYPES).map(([k, v]) => (
              <button key={k} onClick={() => onAdd(k)}>+ {v.label}</button>
            ))}
          </div>
        )}
        {lights.map((L) => (
          <div key={L.id} className={L.id === selectedLight?.id ? 'light-item active' : 'light-item'}
            onClick={() => onSelect(L.id)}>
            <span className="dot" style={{ background: `rgb(${tempCss(L.temp)})` }} />
            <span>{L.name}</span>
            <span className="muted">{LIGHT_TYPES[L.type].label} {L.temp}K</span>
            {editable && (
              <input type="checkbox" checked={L.on} title="开/关"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onChange(L.id, { on: e.target.checked })} />
            )}
          </div>
        ))}
        {!editable && <div className="muted">只读模式</div>}
      </div>

      {selectedLight && editable && (
        <div className="card">
          <div className="card-title">选中: {selectedLight.name}</div>
          <Slider label="位置 X" value={selectedLight.x} min={0.1} max={5.9} step={0.05}
            onChange={(v) => onChange(selectedLight.id, { x: v })} fmt={(v) => v.toFixed(2) + ' m'} />
          <Slider label="位置 Z" value={selectedLight.z} min={0.1} max={3.9} step={0.05}
            onChange={(v) => onChange(selectedLight.id, { z: v })} fmt={(v) => v.toFixed(2) + ' m'} />
          <Slider label="高度" value={selectedLight.h} min={0.3} max={2.6} step={0.05}
            onChange={(v) => onChange(selectedLight.id, { h: v })} fmt={(v) => v.toFixed(2) + ' m'} />
          <Slider label="色温" value={selectedLight.temp} min={2700} max={6500} step={100}
            onChange={(v) => onChange(selectedLight.id, { temp: v })} fmt={(v) => v + ' K'} />
          <Slider label="亮度" value={selectedLight.intensity} min={0} max={1} step={0.01}
            onChange={(v) => onChange(selectedLight.id, { intensity: v })} fmt={(v) => Math.round(v * 100) + ' %'} />
          <Slider label="开合角度" value={selectedLight.angle} min={10} max={120} step={1}
            onChange={(v) => onChange(selectedLight.id, { angle: v })} fmt={(v) => v + ' °'} />
          <Slider label="瞄准 X" value={selectedLight.aimX} min={0} max={6} step={0.05}
            onChange={(v) => onChange(selectedLight.id, { aimX: v })} fmt={(v) => v.toFixed(2) + ' m'} />
          <Slider label="瞄准 Z" value={selectedLight.aimZ} min={0} max={4} step={0.05}
            onChange={(v) => onChange(selectedLight.id, { aimZ: v })} fmt={(v) => v.toFixed(2) + ' m'} />
          <button className="danger block" onClick={() => onDelete(selectedLight.id)}>删除该灯</button>
        </div>
      )}
    </div>
  );
}

function tempCss(k) {
  // 粗略映射用于列表圆点
  const t = (k - 2700) / 3800;
  return `${255},${Math.round(200 + 40 * t)},${Math.round(140 + 100 * t)}`;
}

function Slider({ label, value, min, max, step, onChange, fmt }) {
  return (
    <div className="slider-row">
      <span className="slider-label">{label}</span>
      <input type="range" value={value} min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))} />
      <span className="slider-val">{fmt(value)}</span>
    </div>
  );
}

function StatsPanel({ stats, threshold }) {
  const dark = stats.zones.filter((z) => z.dark);
  return (
    <div>
      <div className="card">
        <div className="card-title">总体照度</div>
        <div className="stat-grid">
          <div>平均<br /><b>{stats.overall.avg.toFixed(0)}</b> lx</div>
          <div>最低区<br /><b>{stats.overall.min.toFixed(0)}</b> lx</div>
          <div>最高区<br /><b>{stats.overall.max.toFixed(0)}</b> lx</div>
          <div>均匀度 U0<br /><b>{stats.overall.uniformity.toFixed(2)}</b></div>
        </div>
        <div className={dark.length ? 'dark-count bad' : 'dark-count ok'}>
          暗区（&lt;{threshold} lx）: {dark.length} 个{dark.length === 0 ? ' ✓' : ', 已在地面标红'}
        </div>
      </div>
      <div className="card">
        <div className="card-title">暗区清单</div>
        {dark.length === 0 && <div className="muted">无暗区</div>}
        {dark.map((z) => (
          <div key={z.id} className="zone-row dark">
            <span>区域 {z.id}</span>
            <span>{z.avg.toFixed(0)} lx</span>
            <span className="muted">U0 {z.uniformity.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-title">各区域照度 / 均匀度</div>
        <div className="zone-table">
          {stats.zones.map((z) => (
            <div key={z.id} className={z.dark ? 'zone-row dark' : 'zone-row'}>
              <span>{z.id}</span>
              <span>{z.avg.toFixed(0)} lx</span>
              <span className="muted">U0 {z.uniformity.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComparePanel({ shot, statsA, statsB, editable, onSetActive, onSnapshotB, onClearB }) {
  return (
    <div className="card">
      <div className="card-title">灯位方案对比（镜头: {shot.name}）</div>
      <div className="btn-row">
        <button className={shot.activeScheme === 'A' ? 'primary' : ''} onClick={() => onSetActive('A')}>方案 A</button>
        <button className={shot.activeScheme === 'B' ? 'primary' : ''} disabled={!shot.schemes.B} onClick={() => onSetActive('B')}>方案 B</button>
      </div>
      {!shot.schemes.B && (
        <>
          <div className="muted">调整灯位前先把当前方案存为 B, 之后改动 A, 即可对比两套灯位的暗区数量。</div>
          <button className="block" onClick={onSnapshotB}>把当前灯位存为方案 B</button>
        </>
      )}
      {shot.schemes.B && statsB && statsA && (
        <>
          <table className="cmp-table">
            <thead><tr><th></th><th>方案 A</th><th>方案 B</th></tr></thead>
            <tbody>
              <tr><td>灯具数</td><td>{shot.schemes.A.lights.length}</td><td>{shot.schemes.B.lights.length}</td></tr>
              <tr><td>暗区数量</td>
                <td className={statsA.darkCount > statsB.darkCount ? 'bad' : ''}>{statsA.darkCount}</td>
                <td className={statsB.darkCount > statsA.darkCount ? 'bad' : ''}>{statsB.darkCount}</td>
              </tr>
              <tr><td>平均照度</td><td>{statsA.overall.avg.toFixed(0)} lx</td><td>{statsB.overall.avg.toFixed(0)} lx</td></tr>
              <tr><td>均匀度 U0</td><td>{statsA.overall.uniformity.toFixed(2)}</td><td>{statsB.overall.uniformity.toFixed(2)}</td></tr>
            </tbody>
          </table>
          <div className={statsA.darkCount <= statsB.darkCount ? 'ok-text' : 'bad-text'}>
            {statsA.darkCount === statsB.darkCount
              ? '两套方案暗区数量相同'
              : `方案 A 比 B ${statsA.darkCount < statsB.darkCount ? '少' : '多'} ${Math.abs(statsA.darkCount - statsB.darkCount)} 个暗区`}
          </div>
          {editable && <button className="block" onClick={onSnapshotB}>用当前灯位覆盖方案 B</button>}
          <button className="danger block" onClick={onClearB}>清除方案 B</button>
        </>
      )}
    </div>
  );
}

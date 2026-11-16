import { createSignal } from 'solid-js';
import PrimitivePalette from './components/PrimitivePalette';
import FeatureList from './components/FeatureList';
import Inspector from './components/Inspector';
import Viewport from './components/Viewport';
import ThreeViewModal from './components/ThreeViewModal';
import StudentPanel from './components/StudentPanel';
import TeacherView from './components/TeacherView';
import { modelStore } from './store/model';
import { eduStore } from './store/education';
import type { InteractionMode } from './three/SceneController';
import type { Role } from './core/types';

const MODES: { key: InteractionMode; label: string; hint: string }[] = [
  { key: 'select', label: '选择/拾取', hint: '点击面进行选择' },
  { key: 'move', label: '移动体块', hint: '拖动体块，带顶点/边中点/面心吸附' },
  { key: 'resize', label: '改尺寸', hint: '拖动选中面沿法线改尺寸' },
  { key: 'clip', label: '剖切平面', hint: '拖动剖切平面平移' },
];

export default function App() {
  const [mode, setMode] = createSignal<InteractionMode>('select');
  const [showViews, setShowViews] = createSignal(false);
  const [leftTab, setLeftTab] = createSignal<'build' | 'hw'>('build');
  const profile = eduStore.profile;

  const switchRole = (role: Role) => {
    eduStore.setProfile({ ...profile(), role });
  };

  return (
    <div class="app">
      <header class="topbar">
        <span class="brand">MC3D · 机械制图三维布尔建模与三视图工具</span>
        <div class="role-switch row" style={{ gap: '4px' }}>
          <button classList={{ toggled: profile().role === 'student' }} onClick={() => switchRole('student')}>
            学员端
          </button>
          <button classList={{ toggled: profile().role === 'teacher' }} onClick={() => switchRole('teacher')}>
            老师端
          </button>
        </div>
        <span class="spacer" />
        <span class="muted" style={{ color: '#9fb2d0' }}>身份：</span>
        <input
          style={{ width: '110px' }}
          value={profile().name}
          onInput={(e) => eduStore.setProfile({ ...profile(), name: e.currentTarget.value || '未命名' })}
        />
      </header>

      {profile().role === 'teacher' ? (
        <TeacherView />
      ) : (
        <div class="workspace">
          <aside class="panel">
            <div class="tabs">
              <button classList={{ toggled: leftTab() === 'build' }} onClick={() => setLeftTab('build')}>
                建模
              </button>
              <button classList={{ toggled: leftTab() === 'hw' }} onClick={() => setLeftTab('hw')}>
                作业
              </button>
            </div>
            {leftTab() === 'build' ? (
              <>
                <h3>体块库（拖入视口）</h3>
                <PrimitivePalette />
                <h3>特征树与布尔运算</h3>
                <FeatureList />
              </>
            ) : (
              <StudentPanel />
            )}
          </aside>

          <main class="viewport-wrap">
            <div class="toolbar">
              {MODES.map((m) => (
                <button
                  classList={{ toggled: mode() === m.key }}
                  title={m.hint}
                  onClick={() => setMode(m.key)}
                >
                  {m.label}
                </button>
              ))}
              <span class="sep" />
              <button onClick={() => modelStore.undo()} disabled={!modelStore.canUndo()} title="Ctrl+Z">
                ↶ 撤销
              </button>
              <button onClick={() => modelStore.redo()} disabled={!modelStore.canRedo()} title="Ctrl+Shift+Z">
                ↷ 重做
              </button>
              <span class="sep" />
              <button class="primary" onClick={() => setShowViews(true)}>
                生成三视图 / 导出 SVG
              </button>
              <button onClick={() => modelStore.resetModel()}>清空模型</button>
            </div>
            <Viewport mode={mode()} />
          </main>

          <aside class="panel right">
            <Inspector />
          </aside>
        </div>
      )}

      {showViews() && <ThreeViewModal onClose={() => setShowViews(false)} />}
    </div>
  );
}

import { createRoot } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import type {
  BoolOp,
  Contour,
  LightMode,
  MaterialKey,
  PanelDesign,
  Pt,
} from '../types';
import { uid } from '../types';

const HISTORY_LIMIT = 20;

interface EditorState {
  contours: Contour[];
  draft: Pt[]; // 正在绘制的轮廓顶点
  thickness: number; // 挤出厚度 mm (2–8)
  material: MaterialKey;
  snapSpacing: number; // 网格吸附间距 mm (2–10)
  lightMode: LightMode;
  showSolid: boolean;
  panelId: string | null; // 关联的订单花板
  panelName: string;
}

/** 参与撤销/重做的字段快照 */
interface Snapshot {
  contours: Contour[];
  draft: Pt[];
  thickness: number;
  material: MaterialKey;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function createEditorStore() {
  const [state, setState] = createStore<EditorState>({
    contours: [],
    draft: [],
    thickness: 4,
    material: 'matte-black',
    snapSpacing: 10,
    lightMode: 'sun',
    showSolid: true,
    panelId: null,
    panelName: '未命名花板',
  });

  let past: Snapshot[] = [];
  let future: Snapshot[] = [];
  // 用版本号驱动 UI 刷新撤销/重做按钮状态
  const [history, setHistory] = createStore({ undoCount: 0, redoCount: 0 });

  const snapshot = (): Snapshot =>
    clone({
      contours: state.contours,
      draft: state.draft,
      thickness: state.thickness,
      material: state.material,
    });

  const syncHistory = () =>
    setHistory({ undoCount: past.length, redoCount: future.length });

  /** 所有可撤销的修改都经由此处提交 */
  const commit = (mutate: () => void) => {
    past.push(snapshot());
    if (past.length > HISTORY_LIMIT) past.shift();
    future = [];
    mutate();
    syncHistory();
  };

  const undo = () => {
    if (past.length === 0) return;
    future.push(snapshot());
    const s = past.pop()!;
    setState(
      produce((st) => {
        st.contours = s.contours;
        st.draft = s.draft;
        st.thickness = s.thickness;
        st.material = s.material;
      }),
    );
    syncHistory();
  };

  const redo = () => {
    if (future.length === 0) return;
    past.push(snapshot());
    const s = future.pop()!;
    setState(
      produce((st) => {
        st.contours = s.contours;
        st.draft = s.draft;
        st.thickness = s.thickness;
        st.material = s.material;
      }),
    );
    syncHistory();
  };

  const actions = {
    // ---- 绘制 ----
    addDraftPoint(p: Pt) {
      commit(() => setState('draft', (d) => [...d, p]));
    },
    /** 闭合草稿为新轮廓 */
    closeDraft(op: BoolOp = 'union') {
      if (state.draft.length < 3) return;
      commit(() => {
        const contour: Contour = {
          id: uid(),
          points: clone(state.draft),
          closed: true,
          op,
        };
        setState(
          produce((st) => {
            st.contours.push(contour);
            st.draft = [];
          }),
        );
      });
    },
    cancelDraft() {
      if (state.draft.length === 0) return;
      commit(() => setState('draft', []));
    },
    deleteContour(id: string) {
      commit(() =>
        setState('contours', (cs) => cs.filter((c) => c.id !== id)),
      );
    },
    setContourOp(id: string, op: BoolOp) {
      commit(() =>
        setState(
          'contours',
          (c) => c.id === id,
          'op',
          op,
        ),
      );
    },
    deleteLastDraftPoint() {
      if (state.draft.length === 0) return;
      commit(() => setState('draft', (d) => d.slice(0, -1)));
    },

    // ---- 参数(可撤销) ----
    setThickness(v: number) {
      commit(() => setState('thickness', Math.min(8, Math.max(2, v))));
    },
    setMaterial(m: MaterialKey) {
      commit(() => setState('material', m));
    },

    // ---- 参数(不参与撤销) ----
    setSnapSpacing(v: number) {
      setState('snapSpacing', Math.min(10, Math.max(2, v)));
    },
    setLightMode(m: LightMode) {
      setState('lightMode', m);
    },
    setShowSolid(v: boolean) {
      setState('showSolid', v);
    },
    setPanelName(name: string) {
      setState('panelName', name);
    },

    undo,
    redo,

    /** 载入订单中的花板进行编辑 */
    loadPanel(panel: PanelDesign) {
      setState(
        produce((st) => {
          st.contours = clone(panel.contours);
          st.draft = [];
          st.thickness = panel.thickness;
          st.material = panel.material;
          st.panelId = panel.id;
          st.panelName = panel.name;
        }),
      );
      past = [];
      future = [];
      syncHistory();
    },
    newPanel(name = '未命名花板') {
      setState(
        produce((st) => {
          st.contours = [];
          st.draft = [];
          st.thickness = 4;
          st.material = 'matte-black';
          st.panelId = null;
          st.panelName = name;
        }),
      );
      past = [];
      future = [];
      syncHistory();
    },
  };

  return { state, history, actions };
}

export const editorStore = createRoot(createEditorStore);

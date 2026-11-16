// 应用外壳：四个界面路由、Toast、全局快捷键、提交对话框桥接
import { createSignal, onCleanup, onMount, Show } from 'solid-js'
import Topbar from './components/Topbar.tsx'
import EditorPage from './pages/EditorPage.tsx'
import ReviewPage from './pages/ReviewPage.tsx'
import VersionsPage from './pages/VersionsPage.tsx'
import ComparePage from './pages/ComparePage.tsx'
import { state, undo, redo } from './store/app.ts'
import type { Annotation } from './types.ts'

type PageId = 'editor' | 'review' | 'versions' | 'compare'

export default function App() {
  const [page, setPage] = createSignal<PageId>('editor')
  const [toast, setToast] = createSignal<string | null>(null)
  const [annotations, setAnnotations] = createSignal<Annotation[]>([])
  const [compareIds, setCompareIds] = createSignal<{ oldId?: string; newId?: string }>({})
  const [submitTick, setSubmitTick] = createSignal(0)
  let toastTimer: ReturnType<typeof setTimeout> | undefined

  function showToast(msg: string) {
    setToast(msg)
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => setToast(null), 4200)
  }

  function openSubmit() {
    setSubmitTick(t => t + 1)
  }

  function onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      if (e.shiftKey) redo(); else undo()
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault(); redo()
    }
    // 工具快捷键
    const map: Record<string, string> = {
      v: 'select', h: 'pan', r: 'rect', c: 'circle',
      a: 'arc', p: 'polygon', b: 'bezier',
    }
    if (!e.ctrlKey && !e.metaKey && map[e.key.toLowerCase()] && page() === 'editor') {
      state.tool = map[e.key.toLowerCase()] as never
    }
  }

  onMount(() => window.addEventListener('keydown', onKey))
  onCleanup(() => window.removeEventListener('keydown', onKey))

  return (
    <div class="app">
      <Topbar
        page={page()}
        onNav={p => setPage(p as PageId)}
        onSubmit={openSubmit}
        onToast={showToast}
      />
      <Show when={page() === 'editor'}>
        <EditorPage
          submitRequest={submitTick()}
          annotations={annotations()}
          setAnnotations={setAnnotations}
          onToast={showToast}
          onSubmitted={() => setPage('versions')}
        />
      </Show>
      <Show when={page() === 'review'}><ReviewPage /></Show>
      <Show when={page() === 'versions'}>
        <VersionsPage
          onCompare={(oldId, newId) => { setCompareIds({ oldId, newId }); setPage('compare') }}
          onEdit={() => setPage('editor')}
          onToast={showToast}
        />
      </Show>
      <Show when={page() === 'compare'}>
        <ComparePage initialOldId={compareIds().oldId} initialNewId={compareIds().newId} />
      </Show>

      <Show when={toast()}>
        <div class="toast">{toast()}</div>
      </Show>
      <Show when={state.busy}>
        <div class="busy-mask">
          <div class="busy-card">
            <div class="spinner" />
            <div>{state.busyLabel}</div>
            <div class="hint" style={{ 'margin-top': '6px' }}>计算运行在 OffscreenCanvas Worker，主画布保持可交互</div>
          </div>
        </div>
      </Show>
    </div>
  )
}

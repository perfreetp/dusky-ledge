// 页面一：轮廓编辑
import { createEffect, createSignal, Show } from 'solid-js'
import EditorCanvas from '../components/EditorCanvas.tsx'
import LeftSidebar from '../components/LeftSidebar.tsx'
import RightSidebar from '../components/RightSidebar.tsx'
import { state, snapshotDoc } from '../store/app.ts'
import { versionStore } from '../lib/versionStore.ts'
import { clone } from '../lib/utils.ts'
import type { Annotation } from '../types.ts'

export interface EditorPageProps {
  onToast: (msg: string) => void
  onSubmitted: (versionId: string) => void
  annotations: Annotation[]
  setAnnotations: (a: Annotation[]) => void
  /** 外部请求打开提交框的信号值（递增） */
  submitRequest?: number
}

export default function EditorPage(props: EditorPageProps) {
  const [showSubmit, setShowSubmit] = createSignal(false)
  const [note, setNote] = createSignal('')
  const [submitter, setSubmitter] = createSignal('设计员-张工')
  const [annMode, setAnnMode] = createSignal(false)

  // 监听 Topbar 经 App 转发的提交请求
  createEffect(() => {
    const req = props.submitRequest
    if (req && req > 0) setShowSubmit(true)
  })

  function doSubmit() {
    const version = versionStore.nextVersion(state.doc.projectNo, state.doc.equipmentNo)
    const rec = versionStore.add({
      projectNo: state.doc.projectNo,
      equipmentNo: state.doc.equipmentNo,
      equipmentName: state.doc.equipmentName,
      version,
      doc: clone(snapshotDoc()),
      submitter: submitter(),
      note: note(),
      annotations: clone(props.annotations),
    })
    setShowSubmit(false)
    setNote('')
    props.onToast(`已提交 ${rec.version}（编号 ${rec.id.slice(-6)}），批注随版本归档`)
    props.onSubmitted(rec.id)
  }

  return (
    <div class="workspace">
      <LeftSidebar />
      <div style={{ flex: 1, display: 'flex', 'flex-direction': 'column', 'min-width': 0 }}>
        <div style={{ padding: '6px 12px', background: 'var(--bg2)', 'border-bottom': '1px solid var(--border)', display: 'flex', 'gap': '10px', 'align-items': 'center' }}>
          <button class={annMode() ? 'active' : ''} onClick={() => setAnnMode(v => !v)}>
            {annMode() ? '退出批注打点' : '审核打点模式'}
          </button>
          <span class="hint" style={{ margin: 0 }}>
            {annMode() ? '在画布上点击即可打点，右侧填写批注内容' : '正常编辑模式'}
          </span>
          <div class="spacer" />
          <span class="muted">工作批注 {props.annotations.length} 条（提交后随版本归档）</span>
        </div>
        <EditorCanvas
          annotations={props.annotations}
          annotationMode={annMode()}
          onAddAnnotation={a => props.setAnnotations([...props.annotations, a])}
        />
      </div>
      <RightSidebar />

      <Show when={showSubmit()}>
        <div class="busy-mask" onClick={() => setShowSubmit(false)}>
          <div class="busy-card" style={{ 'min-width': '420px', 'text-align': 'left' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', color: 'var(--accent)' }}>提交新版本</h3>
            <div class="hint" style={{ 'margin-bottom': '10px' }}>
              项目 {state.doc.projectNo} · 设备 {state.doc.equipmentNo} ·
              下一版本号 <b class="pill">{versionStore.nextVersion(state.doc.projectNo, state.doc.equipmentNo)}</b>
            </div>
            <label>提交人</label>
            <input value={submitter()} onInput={e => setSubmitter(e.currentTarget.value)} style={{ width: '100%', 'margin-bottom': '8px' }} />
            <label>提交说明</label>
            <textarea placeholder="本版轮廓变更说明，例如：避让立柱，东北角倒角" value={note()} onInput={e => setNote(e.currentTarget.value)} />
            <div class="row" style={{ 'margin-top': '12px', 'justify-content': 'flex-end' }}>
              <button onClick={() => setShowSubmit(false)}>取消</button>
              <button class="primary" onClick={doSubmit}>确认提交</button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

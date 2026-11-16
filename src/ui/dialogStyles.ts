/**
 * 对话框 / 表单内容样式。
 * 弹窗内容位于 modal-dialog 的 shadow root 内，调用方组件自己的样式表无法作用到这些元素，
 * 因此所有对话框里用到的类集中在这里，由 modal-dialog 一并 adopt。
 */
export const DIALOG_CSS = `
h2 { font-size: 15px; margin: 0 0 6px; font-weight: 600; }
p { margin: 0 0 10px; }
a { color: var(--accent); }
.form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
.form .full { grid-column: 1 / -1; }
.field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.field label { font-size: 11px; color: var(--fg-dim); }
.field input, .field select, .field textarea { width: 100%; }
.actions { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 16px; }
.hintline { font-size: 10.5px; color: var(--fg-faint); line-height: 1.55; }
.statgrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0 12px; }
.stat { background: #101216; border: 1px solid var(--border-soft); border-radius: 7px; padding: 8px 10px; min-width: 0; }
.stat .v { font-family: var(--mono); font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stat .k { font-size: 10px; color: var(--fg-faint); margin-top: 2px; }
.review-grid { display: grid; grid-template-columns: 1fr; gap: 7px; }
.rcheck { background: #101216; border: 1px solid var(--border-soft); border-radius: 8px; padding: 9px 10px; }
.rcheck .lbl { font-size: 11px; color: var(--fg-dim); margin-bottom: 5px; font-family: var(--mono); }
.rcheck .det { font-size: 10.5px; color: var(--fg-faint); margin-top: 4px; line-height: 1.45; }
.layerbar { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; }
.lb { display: grid; grid-template-columns: 58px 1fr 96px; gap: 8px; align-items: center; font-size: 10.5px; }
.lbt { height: 8px; background: #22262d; border-radius: 3px; overflow: hidden; position: relative; }
.lbf { height: 100%; background: #b89966; }
.lbm { position: absolute; top: 0; bottom: 0; width: 1.5px; background: #bde0ff; }
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.issue-box { margin: 4px 0 14px; }
.review-form { display: flex; flex-direction: column; }
.review-form > .row { margin-bottom: 8px; }
.review-form > .statgrid { margin: 0 0 14px; }
.review-form > .split { margin-bottom: 14px; }
.form .field { margin-bottom: 0; }
.form { margin-top: 4px; }
.actions { border-top: 1px solid var(--border-soft); padding-top: 12px; }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
@media (max-width: 760px) { .split, .form { grid-template-columns: 1fr; } .statgrid { grid-template-columns: repeat(2, 1fr); } }
.preview-canvas { width: 100%; height: 250px; border-radius: 8px; background: #0f1114; border: 1px solid var(--border-soft); display: block; }
.layers-editor { display: flex; flex-direction: column; gap: 5px; margin: 6px 0; }
.layer-row { display: grid; grid-template-columns: 56px 1fr 30px; gap: 8px; align-items: center; }
.layer-row input { width: 100%; }
.check-field { display: flex; align-items: flex-end; padding-bottom: 8px; }
.check-row-inline {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 12px; color: var(--fg); cursor: pointer;
  background: #101216; border: 1px solid var(--border-soft); border-radius: 6px;
  padding: 8px 11px; width: 100%;
}
.check-row-inline input { width: auto; margin: 0; accent-color: var(--accent); }
.rows { display: flex; flex-direction: column; gap: 7px; }
.srow {
  display: grid; grid-template-columns: minmax(90px, 1fr) 90px 110px 1fr auto; gap: 10px; align-items: center;
  padding: 9px 11px; background: #16191d; border: 1px solid var(--border-soft); border-radius: 8px; font-size: 12px;
}
.pick-row {
  display: flex; gap: 10px; align-items: center; padding: 10px 12px;
  background: #16191d; border: 1px solid #2a2f37; border-radius: 8px;
}
.check-row { display: grid; grid-template-columns: 64px 1fr 62px; gap: 8px; align-items: center; font-size: 11.5px; }
.lrow2 { display: grid; grid-template-columns: 56px 1fr 92px; gap: 7px; align-items: center; font-size: 10px; }
.track { height: 5px; border-radius: 3px; background: #22262d; overflow: hidden; }
.track > i { display: block; height: 100%; border-radius: 3px; }
.track7 { height: 7px; }
.pos { position: relative; }
`;

import { editorStore } from '../src/store/editorStore';

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗ FAIL:', name); }
}

const { state, history, actions } = editorStore;

console.log('editor store:');
// 连续放置 25 个草稿点 → 历史应封顶 20
for (let i = 0; i < 25; i++) actions.addDraftPoint({ x: i * 10, y: 0 });
ok(state.draft.length === 25, '放置 25 点');
ok(history.undoCount === 20, `撤销历史上限 20 (实际 ${history.undoCount})`);

// 连续撤销 20 步
for (let i = 0; i < 20; i++) actions.undo();
ok(state.draft.length === 5, `撤销 20 步后剩 5 点 (实际 ${state.draft.length})`);
ok(history.undoCount === 0 && history.redoCount === 20, '撤销/重做计数');

// 连续重做
for (let i = 0; i < 20; i++) actions.redo();
ok(state.draft.length === 25, '重做恢复 25 点');

// 闭合轮廓
actions.newPanel();
actions.addDraftPoint({ x: 0, y: 0 });
actions.addDraftPoint({ x: 100, y: 0 });
actions.addDraftPoint({ x: 100, y: 100 });
actions.closeDraft();
ok(state.contours.length === 1 && state.contours[0].closed && state.draft.length === 0, '闭合草稿成轮廓');

// 新修改清空重做栈
actions.undo();
ok(state.contours.length === 0 && history.redoCount === 1, '撤销闭合');
actions.addDraftPoint({ x: 5, y: 5 });
ok(history.redoCount === 0, '新操作清空重做栈');

// 厚度夹取 2–8
actions.setThickness(10);
ok(state.thickness === 8, '厚度上限 8mm');
actions.setThickness(1);
ok(state.thickness === 2, '厚度下限 2mm');

// 网格间距夹取 2–10
actions.setSnapSpacing(1);
ok(state.snapSpacing === 2, '吸附间距下限 2mm');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

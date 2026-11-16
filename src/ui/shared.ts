// ===== Web Components 共享样式（Shadow DOM 内注入）=====
export const sharedCSS = `
:host {
  --bg: #1e2228;
  --panel: #262b33;
  --panel2: #2f353f;
  --line: #3a414c;
  --text: #e6e9ee;
  --muted: #9aa3b0;
  --accent: #4ea1ff;
  --accent2: #35c48f;
  --warn: #f0a73e;
  --danger: #ef5f6b;
  --radius: 8px;
  font-size: 13px;
  color: var(--text);
  font-family: "Segoe UI", "Microsoft YaHei", system-ui, sans-serif;
}
* { box-sizing: border-box; }
button {
  font: inherit;
  color: var(--text);
  background: var(--panel2);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}
button:hover { background: #39404b; border-color: #4d5663; }
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
button.primary:hover { background: #3b8ce6; }
button.success { background: var(--accent2); border-color: var(--accent2); color: #0c231b; }
button.danger { background: transparent; border-color: var(--danger); color: var(--danger); }
button.danger:hover { background: rgba(239,95,107,.15); }
button.ghost { background: transparent; }
button:disabled { opacity: .45; cursor: not-allowed; }
input, select, textarea {
  font: inherit;
  color: var(--text);
  background: #1a1e24;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 6px 8px;
  width: 100%;
}
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--accent); }
label { color: var(--muted); display: block; margin-bottom: 4px; font-size: 12px; }
.row { display: flex; gap: 8px; align-items: center; }
.col { display: flex; flex-direction: column; gap: 8px; }
.tag {
  display: inline-block; padding: 2px 8px; border-radius: 999px;
  font-size: 11px; border: 1px solid var(--line); color: var(--muted);
}
.tag.draft { color: var(--muted); }
.tag.assigned { color: var(--accent); border-color: var(--accent); }
.tag.in_progress { color: var(--warn); border-color: var(--warn); }
.tag.submitted { color: #b58cff; border-color: #8a62e0; }
.tag.rejected { color: var(--danger); border-color: var(--danger); }
.tag.approved { color: var(--accent2); border-color: var(--accent2); }
h1,h2,h3,h4 { margin: 0; font-weight: 600; }
.scroll { overflow: auto; }
.scroll::-webkit-scrollbar { width: 9px; height: 9px; }
.scroll::-webkit-scrollbar-thumb { background: #3d444f; border-radius: 6px; }
.scroll::-webkit-scrollbar-track { background: transparent; }
.small { font-size: 11px; color: var(--muted); }
hr { border: none; border-top: 1px solid var(--line); margin: 10px 0; }
`;

export const STATUS_LABEL: Record<string, string> = {
  draft: '待分派',
  assigned: '已分派',
  in_progress: '制作中',
  submitted: '待抽查',
  rejected: '已打回',
  approved: '已通过'
};

export const DIFFICULTIES = ['入门', '初级', '中级', '高级', '专业'] as const;

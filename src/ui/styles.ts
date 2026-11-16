const STYLE_ID = 'svl-shared-style';

const CSS = `
:host {
  --bg: #14161a;
  --bg-elev: #1b1e23;
  --bg-soft: #22262d;
  --bg-hover: #2a2f37;
  --border: #2f343c;
  --border-soft: #262a31;
  --fg: #e6e2d8;
  --fg-dim: #a8a49a;
  --fg-faint: #7a776f;
  --accent: #d7a55a;
  --accent-soft: #3a2f1d;
  --ok: #7fb069;
  --warn: #e0a458;
  --bad: #cf6679;
  --info: #6f9bc4;
  --radius: 8px;
  --font: "Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  --mono: "Cascadia Mono", "Consolas", "SF Mono", monospace;
  color: var(--fg);
  font-family: var(--font);
  font-size: 13px;
  box-sizing: border-box;
}
*, *::before, *::after { box-sizing: border-box; }
button {
  font-family: inherit;
  font-size: 12px;
  color: var(--fg);
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  transition: background .12s, border-color .12s, color .12s;
  line-height: 1.3;
}
button:hover:not(:disabled) { background: var(--bg-hover); border-color: #3d434c; }
button:active:not(:disabled) { transform: translateY(1px); }
button:disabled { opacity: .38; cursor: not-allowed; }
button.primary { background: #8a6326; border-color: #a87a34; color: #fff5e2; font-weight: 600; }
button.primary:hover:not(:disabled) { background: #9c7130; }
button.ghost { background: transparent; border-color: var(--border); }
button.danger:hover:not(:disabled) { background: #3a2228; border-color: #6b3a44; color: #f2b8c1; }
button.on { background: var(--accent-soft); border-color: var(--accent); color: #f3d8a8; }
input, select, textarea {
  font-family: inherit;
  font-size: 12px;
  color: var(--fg);
  background: #101216;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 8px;
  outline: none;
  min-width: 0;
}
input:focus, select:focus, textarea:focus { border-color: var(--accent); }
input[type=range] { padding: 0; accent-color: var(--accent); }
label { color: var(--fg-dim); font-size: 12px; }
.row { display: flex; gap: 8px; align-items: center; }
.col { display: flex; flex-direction: column; gap: 6px; }
.wrap { flex-wrap: wrap; }
.grow { flex: 1 1 auto; min-width: 0; }
.mono { font-family: var(--mono); font-variant-numeric: tabular-nums; }
.dim { color: var(--fg-dim); }
.faint { color: var(--fg-faint); }
.tiny { font-size: 11px; }
.strong { font-weight: 600; }
.sep { height: 1px; background: var(--border-soft); margin: 8px 0; border: 0; }
.tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 1px 6px; border-radius: 999px; font-size: 10px;
  background: var(--bg-soft); color: var(--fg-dim); border: 1px solid var(--border-soft);
}
.tag.ok { color: #b6dfa2; border-color: #3c5232; background: #1e2a19; }
.tag.warn { color: #f0cb91; border-color: #5a4526; background: #2c2416; }
.tag.bad { color: #f0a8b5; border-color: #5c2f39; background: #2c1a20; }
.tag.info { color: #b4d2ea; border-color: #2f4557; background: #1a242c; }
.scroll { overflow-y: auto; scrollbar-width: thin; scrollbar-color: #3a4048 transparent; }
.scroll::-webkit-scrollbar { width: 9px; height: 9px; }
.scroll::-webkit-scrollbar-thumb { background: #343a42; border-radius: 5px; border: 2px solid transparent; background-clip: padding-box; }
.scroll::-webkit-scrollbar-thumb:hover { background: #454c56; background-clip: padding-box; }
.scroll::-webkit-scrollbar-track { background: transparent; }
`;

/** 把共享样式注入到 shadow root（Constructable Stylesheet 不可用时回退到 <style>） */
export function adoptStyles(root: ShadowRoot): void {
  if (typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype && 'adoptedStyleSheets' in root) {
    const sheet = getSheet();
    root.adoptedStyleSheets = [sheet];
    return;
  }
  if (root.getElementById?.(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  root.append(style);
}

let sharedSheet: CSSStyleSheet | null = null;
function getSheet(): CSSStyleSheet {
  if (sharedSheet) return sharedSheet;
  sharedSheet = new CSSStyleSheet();
  sharedSheet.replaceSync(CSS);
  return sharedSheet;
}

export const SHARED_CSS = CSS;

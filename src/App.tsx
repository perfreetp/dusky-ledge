import { onMount, Show } from 'solid-js';
import Toolbar from './components/Toolbar';
import ParamPanel from './components/ParamPanel';
import Viewport from './components/Viewport';
import VersionPanel from './components/VersionPanel';
import AnnotationPanel from './components/AnnotationPanel';
import CompareOverlay from './components/CompareOverlay';
import { actions, state } from './state/store';
import { exportBackup, importBackup, type BackupFile } from './persistence/backup';

import { css } from './ui/style';
export default function App() {
  onMount(async () => {
    await actions.hydrate();
    actions.regenerate();
  });

  let fileInput: HTMLInputElement | undefined;
  const onImportFile = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text()) as BackupFile;
      await importBackup(backup);
      await actions.hydrate();
      actions.regenerate();
      actions.toast('备份已导入');
    } catch (err) {
      actions.toast(`导入失败：${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const onExport = async () => {
    const backup = await exportBackup(new Date().toISOString());
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `karst-cave-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div class="app">
      <Toolbar onExport={onExport} onImport={() => fileInput?.click()} />
      <input ref={fileInput} type="file" accept="application/json" style={css({ display: 'none' })}  onChange={onImportFile} />
      <div class="workspace">
        <ParamPanel />
        <Viewport />
        <div class="panel right scroll-y">
          <VersionPanel />
          <div class="divider" />
          <AnnotationPanel />
        </div>
      </div>
      <Show when={state.compare.active}>
        <CompareOverlay />
      </Show>
      <Show when={state.toast}>
        <div class="toast">{state.toast}</div>
      </Show>
    </div>
  );
}

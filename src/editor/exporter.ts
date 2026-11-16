// ===== 导出：PNG 序列帧 + 关键帧数据，JSZip 打包 =====
import JSZip from 'jszip';
import type { Clip, ExportRecord, Project } from '../core/types';
import type { EditorViewport } from './viewport';
import { sampleClip } from '../core/animation';
import { uid } from '../core/math';

export interface ExportProgress {
  (done: number, total: number): void;
}

/**
 * 从当前镜头逐帧渲染并导出。
 * startFrame：再导出时帧号对齐起点（沿用上一次导出的 startFrame）。
 */
export async function exportSequence(
  viewport: EditorViewport,
  project: Project,
  clip: Clip,
  startFrame: number,
  onProgress?: ExportProgress
): Promise<{ record: ExportRecord; blob: Blob }> {
  const zip = new JSZip();
  const frames: string[] = [];
  const frameCount = Math.round(clip.duration * clip.fps) + 1;

  for (let f = 0; f < frameCount; f++) {
    const t = f / clip.fps;
    const pose = sampleClip(clip, t);
    viewport.setPose(pose);
    viewport.requestRender();
    // 等待一帧 RAF，确保 WebGL 绘制完成（preserveDrawingBuffer: true）
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => setTimeout(r, 0));
    const dataUrl = viewport.canvas.toDataURL('image/png');
    const frameNo = startFrame + f;
    frames.push(`frame_${String(frameNo).padStart(5, '0')}.png`);
    zip.file(frames[frames.length - 1], dataUrl.split(',')[1], { base64: true });
    onProgress?.(f + 1, frameCount);
  }

  // 关键帧数据
  const keyframeData = {
    format: 'aerial-rig/keyframes+json',
    version: 1,
    exportedAt: new Date().toISOString(),
    project: project.name,
    clip: {
      id: clip.id,
      name: clip.name,
      duration: clip.duration,
      fps: clip.fps,
      startFrame,
      frameCount
    },
    skeleton: project.skeleton.map((b, i) => ({
      index: i, id: b.id, name: b.name, parentId: b.parentId,
      localPos: b.localPos, localRot: b.localRot, color: b.color
    })),
    tracks: clip.tracks.map((t) => ({
      boneId: t.boneId,
      keys: t.keys.map((k) => ({
        time: k.time,
        frame: Math.round(k.time * clip.fps),
        pos: k.pos,
        rot: k.rot,
        inX: k.inX,
        outX: k.outX,
        linear: (k as typeof k & { segmentLinear?: boolean }).segmentLinear === true
      }))
    }))
  };
  zip.file('keyframes.json', JSON.stringify(keyframeData, null, 2));
  zip.file('manifest.json', JSON.stringify({
    frameNaming: 'frame_00000.png',
    startFrame,
    frameCount,
    fps: clip.fps,
    duration: clip.duration,
    frames
  }, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const record: ExportRecord = {
    at: Date.now(),
    frameCount,
    startFrame,
    clipId: clip.id,
    clipName: clip.name,
    zipName: `${project.name}_${clip.name}_f${startFrame}.zip`
  };
  return { record, blob };
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** 计算再导出对齐起点：若该版本已有导出，沿用上次 startFrame；否则用新起点 */
export function nextStartFrame(prev: ExportRecord[]): number {
  if (!prev.length) return 0;
  const last = prev[prev.length - 1];
  return last.startFrame; // 同名覆盖式对齐
}

export function newExportId(): string {
  return uid('exp');
}

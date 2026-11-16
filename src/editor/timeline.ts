// ===== 时间轴：轨道关键帧、拖拽改时间、切线手柄、播放控制 =====
import type { Clip, Keyframe } from '../core/types';
import { getTrack, isSegmentLinear } from '../core/animation';

export interface TimelineEvents {
  seek: (time: number) => void;
  moveKey: (boneId: string, keyId: string, time: number) => void;
  selectKey: (boneId: string | null, keyId: string | null) => void;
  togglePlay: () => void;
  setFps: (fps: number) => void;
}

export class Timeline {
  private host: HTMLElement;
  private clip: Clip;
  private currentTime = 0;
  private playing = false;
  private selected: { boneId: string; keyId: string } | null = null;
  private events: TimelineEvents;
  private bones: { id: string; name: string; color: [number, number, number] }[];
  private dragKey: { boneId: string; keyId: string } | null = null;
  private scrubbing = false;

  constructor(host: HTMLElement, clip: Clip, bones: { id: string; name: string; color: [number, number, number] }[], events: TimelineEvents) {
    this.host = host;
    this.clip = clip;
    this.bones = bones;
    this.events = events;
    this.bind();
    this.render();
  }

  setClip(clip: Clip) { this.clip = clip; this.selected = null; this.render(); }
  setBones(bones: typeof this.bones) { this.bones = bones; this.render(); }
  setTime(t: number) {
    this.currentTime = Math.max(0, Math.min(this.clip.duration, t));
    this.updatePlayhead();
  }
  setPlaying(p: boolean) { this.playing = p; this.updatePlayBtn(); }
  setSelected(boneId: string | null, keyId: string | null) {
    this.selected = boneId && keyId ? { boneId, keyId } : null;
    this.render();
  }

  private get lane(): HTMLElement { return this.host.querySelector('.lane')!; }

  private bind() {
    this.host.addEventListener('pointerdown', (e) => {
      const keyEl = (e.target as HTMLElement).closest('[data-key]') as HTMLElement | null;
      if (keyEl) {
        const boneId = keyEl.dataset.bone!;
        const keyId = keyEl.dataset.key!;
        this.selected = { boneId, keyId };
        this.events.selectKey(boneId, keyId);
        this.dragKey = { boneId, keyId };
        try { this.host.setPointerCapture?.(e.pointerId); } catch { /* 合成事件无指针捕获 */ }
        this.render();
        return;
      }
      if ((e.target as HTMLElement).classList.contains('lane') || (e.target as HTMLElement).classList.contains('ruler')) {
        this.scrubbing = true;
        this.scrub(e.clientX);
      }
    });
    this.host.addEventListener('pointermove', (e) => {
      if (this.dragKey) {
        const t = this.xToTime(this.laneX(e.clientX));
        // 吸附到帧
        const snapped = Math.round(t * this.clip.fps) / this.clip.fps;
        this.events.moveKey(this.dragKey.boneId, this.dragKey.keyId, snapped);
      } else if (this.scrubbing) {
        this.scrub(e.clientX);
      }
    });
    const end = () => { this.dragKey = null; this.scrubbing = false; };
    this.host.addEventListener('pointerup', end);
    this.host.addEventListener('pointercancel', end);
  }

  private scrub(clientX: number) {
    const t = Math.max(0, Math.min(this.clip.duration, this.xToTime(this.laneX(clientX))));
    this.events.seek(t);
  }

  private laneX(clientX: number): number {
    const rect = this.lane.getBoundingClientRect();
    return clientX - rect.left;
  }

  private xToTime(x: number): number {
    const w = this.lane.clientWidth;
    return (x / w) * this.clip.duration;
  }
  private timeToX(t: number): number {
    return (t / this.clip.duration) * this.lane.clientWidth;
  }

  render() {
    const frameCount = Math.round(this.clip.duration * this.clip.fps);
    const ticks: string[] = [];
    for (let f = 0; f <= frameCount; f += Math.max(1, Math.round(frameCount / 20))) {
      const x = (f / frameCount) * 100;
      ticks.push(`<span class="tick" style="left:${x}%"><i>${f}</i></span>`);
    }

    const boneName = (id: string) => this.bones.find((b) => b.id === id)?.name ?? '?';
    const boneColor = (id: string) => {
      const c = this.bones.find((b) => b.id === id)?.color ?? [0.7, 0.7, 0.7];
      return `rgb(${c.map((v) => Math.round(v * 255)).join(',')})`;
    };

    const rows = this.clip.tracks.filter((t) => t.keys.length).map((track) => {
      const keys = track.keys.map((k) => {
        const x = (k.time / this.clip.duration) * 100;
        const sel = this.selected?.keyId === k.id;
        const lin = isSegmentLinear(k);
        return `<span class="key ${sel ? 'sel' : ''} ${lin ? 'linear' : ''}" data-key="${k.id}" data-bone="${track.boneId}"
          style="left:${x}%;background:${boneColor(track.boneId)}" title="${k.time.toFixed(2)}s"></span>`;
      }).join('');
      return `<div class="track-row">
        <div class="track-label" title="${track.boneId}">${boneName(track.boneId)}</div>
        <div class="track-lane">${keys}</div>
      </div>`;
    }).join('');

    this.host.innerHTML = `
      <div class="tl-toolbar">
        <button id="playBtn">▶ 播放</button>
        <span class="small">时间 <b id="timeTxt">${this.currentTime.toFixed(2)}</b>s</span>
        <span class="small">帧 <b id="frameTxt">${Math.round(this.currentTime * this.clip.fps)}</b>/${frameCount}</span>
        <label style="margin:0">FPS
          <select id="fpsSel" style="width:72px">
            ${[12, 24, 30, 60].map((f) => `<option value="${f}" ${f === this.clip.fps ? 'selected' : ''}>${f}</option>`).join('')}
          </select>
        </label>
        <span class="small">关键帧总数 <b>${this.clip.tracks.reduce((s, t) => s + t.keys.length, 0)}</b></span>
      </div>
      <div class="ruler">${ticks.join('')}<span class="playhead" id="ph1"></span></div>
      <div class="lane scroll" id="lane">
        <div class="rows">${rows || '<div class="no-keys small">暂无关键帧 — 在动画模式选中骨骼调整姿态后点击「打关键帧」</div>'}</div>
        <span class="playhead" id="ph2"></span>
      </div>
      <div class="tangent-panel" id="tangentPanel"></div>
    `;
    this.applyStyles();
    this.host.querySelector('#playBtn')!.addEventListener('click', () => this.events.togglePlay());
    this.host.querySelector('#fpsSel')!.addEventListener('change', (e) =>
      this.events.setFps(+(e.target as HTMLSelectElement).value));
    this.updatePlayhead();
    this.updatePlayBtn();
    this.renderTangent();
  }

  private renderTangent() {
    const panel = this.host.querySelector('#tangentPanel') as HTMLElement;
    if (!this.selected) {
      panel.innerHTML = '<span class="small">选中一个关键帧可调节缓入缓出 / 匀速</span>';
      return;
    }
    const track = getTrack(this.clip, this.selected.boneId);
    const key = track?.keys.find((k) => k.id === this.selected!.keyId);
    if (!key) { panel.innerHTML = ''; return; }
    const linear = isSegmentLinear(key);
    panel.innerHTML = `
      <span class="small">关键帧 @ ${key.time.toFixed(2)}s</span>
      <label class="inline">缓入 <input type="range" id="inX" min="0.05" max="0.95" step="0.01" value="${key.inX}" ${linear ? 'disabled' : ''}></label>
      <label class="inline">缓出 <input type="range" id="outX" min="0.05" max="0.95" step="0.01" value="${key.outX}" ${linear ? 'disabled' : ''}></label>
      <label class="inline ck"><input type="checkbox" id="lin" ${linear ? 'checked' : ''}> 到下一帧匀速（线性段）</label>
      <span class="small" id="easeHint"></span>
    `;
    const hint = panel.querySelector('#easeHint')!;
    const describe = () => {
      if (linear) { hint.textContent = '当前段：匀速线性'; return; }
      const easeIn = key.inX > 0.55 ? '强' : key.inX < 0.45 ? '弱' : '中';
      const easeOut = key.outX < 0.45 ? '强' : key.outX > 0.55 ? '弱' : '中';
      hint.textContent = `缓入${easeIn} · 缓出${easeOut}（贝塞尔手柄）`;
    };
    describe();
    panel.querySelector('#inX')!.addEventListener('input', (e) => {
      key.inX = +(e.target as HTMLInputElement).value; describe();
    });
    panel.querySelector('#outX')!.addEventListener('input', (e) => {
      key.outX = +(e.target as HTMLInputElement).value; describe();
    });
    panel.querySelector('#lin')!.addEventListener('change', (e) => {
      const on = (e.target as HTMLInputElement).checked;
      (key as Keyframe & { segmentLinear?: boolean }).segmentLinear = on;
      this.render();
    });
  }

  private updatePlayhead() {
    const pct = (this.currentTime / this.clip.duration) * 100;
    const ph1 = this.host.querySelector('#ph1') as HTMLElement | null;
    const ph2 = this.host.querySelector('#ph2') as HTMLElement | null;
    if (ph1) ph1.style.left = `${pct}%`;
    if (ph2) ph2.style.left = `${pct}%`;
    const tt = this.host.querySelector('#timeTxt');
    const ft = this.host.querySelector('#frameTxt');
    if (tt) tt.textContent = this.currentTime.toFixed(2);
    if (ft) ft.textContent = String(Math.round(this.currentTime * this.clip.fps));
  }

  private updatePlayBtn() {
    const btn = this.host.querySelector('#playBtn') as HTMLElement | null;
    if (btn) btn.textContent = this.playing ? '⏸ 暂停' : '▶ 播放';
  }

  private applyStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .tl-toolbar { display:flex; align-items:center; gap:14px; padding:8px 12px; border-bottom:1px solid #3a414c; }
      .tl-toolbar label { display:flex; align-items:center; gap:6px; color:#9aa3b0; }
      .ruler { position:relative; height:26px; background:#22272e; border-bottom:1px solid #3a414c; cursor:pointer; }
      .tick { position:absolute; top:0; bottom:0; width:1px; background:#3a414c; }
      .tick i { position:absolute; top:2px; left:3px; font-style:normal; font-size:10px; color:#7c8593; }
      .lane { position:relative; height:170px; overflow-x:hidden; overflow-y:auto; background:#1e2228; }
      .rows { position:relative; min-height:100%; }
      .track-row { display:flex; height:34px; align-items:center; border-bottom:1px solid #2a2f37; }
      .track-label { width:110px; flex:none; padding:0 10px; font-size:12px; color:#c8cdd6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .track-lane { position:relative; flex:1; height:100%; }
      .key { position:absolute; top:50%; width:13px; height:13px; transform:translate(-50%,-50%) rotate(45deg);
        border-radius:3px; cursor:grab; border:1px solid rgba(0,0,0,.5); }
      .key.sel { box-shadow:0 0 0 2px #fff, 0 0 9px rgba(255,255,255,.6); z-index:2; }
      .key.linear::after { content:''; position:absolute; inset:3px; background:rgba(0,0,0,.55); border-radius:1px; }
      .playhead { position:absolute; top:0; bottom:0; width:2px; background:#f0a73e; z-index:5; pointer-events:none; }
      #ph1 { bottom:0; }
      .no-keys { padding:24px; text-align:center; }
      .tangent-panel { display:flex; align-items:center; gap:16px; padding:8px 12px; border-top:1px solid #3a414c; flex-wrap:wrap; min-height:40px; }
      .inline { display:flex; align-items:center; gap:6px; margin:0; color:#9aa3b0; font-size:12px; }
      .inline input[type=range] { width:120px; }
      .ck input { width:auto; }
    `;
    this.host.prepend(style);
  }
}

// ===== 编辑器主工作区 =====
import { BaseComponent, modal, toast } from '../ui/base';
import { store } from '../core/store';
import type { Project, Bone, AnimationVersion, Clip, Keyframe } from '../core/types';
import {
  createDefaultSkeleton, deleteBone, wouldCycle, emptyPose, type Pose
} from '../core/skeleton';
import { buildDefaultMesh, parseOBJ, countUnpainted, normalizeAll, autoWeight } from '../core/mesh';
import {
  createClip, createVersion, upsertKey, deleteKey, moveKey, setKeyTangent,
  sampleClip, copyPoseAt, pastePose, cloneClip, makeKey, getTrack,
  setSegmentLinear, isSegmentLinear, totalKeyCount
} from '../core/animation';
import { EditorViewport, type ViewportState } from './viewport';
import { Timeline } from './timeline';
import { exportSequence, downloadBlob, nextStartFrame } from './exporter';
import { q, v3, type Vec3, type Quat } from '../core/math';

type Mode = 'rig' | 'paint' | 'animate';

export class EditorWorkspace extends BaseComponent {
  private project!: Project;
  private readonly = false;
  private mode: Mode = 'rig';
  private selectedBoneId: string | null = null;
  private gizmoMode: 'translate' | 'rotate' = 'rotate';
  private viewport: EditorViewport | null = null;
  private timeline: Timeline | null = null;
  private timelineHost: HTMLElement | null = null;
  private playTimer: number | null = null;
  private currentTime = 0;
  private poseSnapshot: { time: number; bones: { boneId: string; pos: Vec3; rot: Quat }[] } | null = null;
  private brushBoneIndex = 0;
  private brushValue = 1;
  private brushReplace = true;
  private exporting = false;

  private pendingInit: { projectId: string; readonly: boolean } | null = null;

  init(projectId: string, readonly: boolean) {
    if (!this.isConnected) {
      this.pendingInit = { projectId, readonly };
      return;
    }
    this.bootstrap(projectId, readonly);
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.pendingInit) {
      const p = this.pendingInit;
      this.pendingInit = null;
      this.bootstrap(p.projectId, p.readonly);
    }
  }

  private bootstrap(projectId: string, readonly: boolean) {
    const p = store.getProject(projectId);
    if (!p) { toast('项目不存在', 'err'); return; }
    this.project = structuredClone(p);
    this.readonly = readonly;
    if (!this.project.versions.length) {
      const clip = createClip('主动作 v1');
      const ver = createVersion('v1', clip);
      this.project.versions.push(ver);
      this.project.activeVersionId = ver.id;
    }
    this.render();
  }

  private get clip(): Clip {
    const v = this.project.versions.find((x) => x.id === this.project.activeVersionId) ?? this.project.versions[0];
    return v.clip;
  }

  private get version(): AnimationVersion {
    return this.project.versions.find((x) => x.id === this.project.activeVersionId) ?? this.project.versions[0];
  }

  private currentPose(): Pose {
    if (this.mode === 'animate') return sampleClip(this.clip, this.currentTime);
    return emptyPose();
  }

  private vpState(): ViewportState {
    return {
      mode: this.mode,
      pose: this.currentPose(),
      selectedBoneId: this.selectedBoneId,
      gizmoMode: this.gizmoMode,
      brushBoneIndex: this.brushBoneIndex,
      brushValue: this.brushValue,
      brushReplace: this.brushReplace
    };
  }

  protected onState() { /* 编辑器内部状态独立管理，不随全局 store 重渲染 */ }

  protected render() {
    if (!this.project) { this.shell('<div style="padding:40px;color:#9aa3b0">加载项目中…</div>'); return; }
    this.shell(`
      <div class="editor">
        <div class="toolbar">
          <button id="backBtn">← 返回</button>
          <strong class="title">${this.project.name}</strong>
          <span class="tag">${this.readonly ? '只读查看' : '可编辑'}</span>
          <div class="spacer"></div>
          <div class="modes">
            <button data-m="rig" class="${this.mode === 'rig' ? 'primary' : ''}">骨架模式</button>
            <button data-m="paint" class="${this.mode === 'paint' ? 'primary' : ''}">权重模式</button>
            <button data-m="animate" class="${this.mode === 'animate' ? 'primary' : ''}">动画模式</button>
          </div>
          <div class="spacer"></div>
          <button id="saveBtn" class="success" ${this.readonly ? 'disabled' : ''}>保存项目</button>
        </div>
        <div class="body">
          <aside class="left scroll" id="leftPanel"></aside>
          <main class="center">
            <div class="viewport-bar" id="viewportBar"></div>
            <canvas id="glcanvas"></canvas>
            <div class="timeline-host" id="timelineHost" hidden></div>
          </main>
        </div>
      </div>
    `, this.css());

    this.$('#backBtn')!.addEventListener('click', () => this.back());
    this.$('#saveBtn')!.addEventListener('click', () => this.save());
    this.$all('.modes button').forEach((b) => b.addEventListener('click', () => this.switchMode((b as HTMLElement).dataset.m as Mode)));

    const canvas = this.$('#glcanvas') as HTMLCanvasElement;
    this.viewport = new EditorViewport(canvas, this.project, this.vpState());
    this.viewport.onChange = (kind, payload) => this.handleViewport(kind, payload);
    this.timelineHost = this.$('#timelineHost') as HTMLElement;

    this.renderLeftPanel();
    this.renderViewportBar();
    this.setupTimeline();
  }

  private handleViewport(kind: string, payload: unknown) {
    if (this.readonly) return;
    if (kind === 'select-bone') {
      this.selectedBoneId = payload as string;
      this.viewport?.updateState(this.vpState());
      this.renderLeftPanel();
    } else if (kind === 'gizmo-transform') {
      const { pos, rot } = payload as { pos: Vec3; rot: Quat };
      this.applyTransform(pos, rot, false);
    } else if (kind === 'gizmo-end') {
      this.applyTransform(null, null, true);
    } else if (kind === 'weight-painted') {
      const p = payload as { unpainted: number };
      const el = this.$('#unpaintedCount');
      if (el) el.textContent = String(p.unpainted);
    }
  }

  private applyTransform(pos: Vec3 | null, rot: Quat | null, commit: boolean) {
    const bone = this.project.skeleton.find((b) => b.id === this.selectedBoneId);
    if (!bone) return;
    if (this.mode === 'rig') {
      if (pos) bone.localPos = [...pos] as Vec3;
      if (rot) bone.localRot = q.copy(rot);
      this.viewport?.updateState(this.vpState());
      if (commit) this.renderLeftPanel();
    } else if (this.mode === 'animate') {
      // 实时更新采样 pose 驱动骨架（不落关键帧，点击打帧才记录）
      const pose = this.vpState().pose;
      const curP = pose.positions.get(bone.id) ?? bone.localPos;
      const curR = pose.rotations.get(bone.id) ?? bone.localRot;
      pose.positions.set(bone.id, pos ? [...pos] as Vec3 : curP);
      pose.rotations.set(bone.id, rot ? q.copy(rot) : curR);
      this.viewport?.updateState(this.vpState());
      if (commit) this.renderViewportBar();
    }
  }

  private switchMode(m: Mode) {
    this.stopPlay();
    this.mode = m;
    this.currentTime = 0;
    this.selectedBoneId = null;
    this.render();
  }

  // ===== 左侧面板 =====
  private renderLeftPanel() {
    const panel = this.$('#leftPanel');
    if (!panel) return;
    if (this.mode === 'rig') panel.innerHTML = this.rigPanelHTML();
    else if (this.mode === 'paint') panel.innerHTML = this.paintPanelHTML();
    else panel.innerHTML = this.animatePanelHTML();
    this.bindLeftPanel();
  }

  private boneTreeHTML(bone: Bone, depth: number): string {
    const kids = this.project.skeleton.filter((b) => b.parentId === bone.id);
    const sel = bone.id === this.selectedBoneId;
    const color = '#' + bone.color.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
    return `
      <div class="tree-row ${sel ? 'sel' : ''}" data-bone="${bone.id}" style="padding-left:${8 + depth * 14}px">
        <i class="dot" style="background:${color}"></i>
        <span class="tname">${bone.name}</span>
      </div>
      ${kids.map((k) => this.boneTreeHTML(k, depth + 1)).join('')}`;
  }

  private rigPanelHTML(): string {
    const roots = this.project.skeleton.filter((b) => !b.parentId);
    const sel = this.project.skeleton.find((b) => b.id === this.selectedBoneId);
    const parentOptions = this.project.skeleton
      .filter((b) => b.id !== this.selectedBoneId && !wouldCycle(this.project.skeleton, this.selectedBoneId ?? '', b.id))
      .map((b) => `<option value="${b.id}" ${sel?.parentId === b.id ? 'selected' : ''}>${b.name}</option>`).join('');
    const euler = sel ? q.toEuler(sel.localRot).map((x) => (x * 180 / Math.PI).toFixed(1)) : ['0', '0', '0'];
    return `
      <section>
        <h4>网格</h4>
        <div class="col">
          <button id="genMesh">生成默认人形网格</button>
          <label class="file-btn">导入 OBJ 网格<input type="file" id="objFile" accept=".obj" hidden></label>
          <div class="row">
            <label class="ck"><input type="checkbox" id="showMesh" ${this.project.showMesh ? 'checked' : ''}> 显示网格</label>
            <label class="ck"><input type="checkbox" id="showBones" ${this.project.showBones ? 'checked' : ''}> 显示骨骼</label>
          </div>
        </div>
      </section>
      <hr>
      <section>
        <h4>骨架层级（${this.project.skeleton.length} 根）</h4>
        <div class="tree scroll">${roots.map((r) => this.boneTreeHTML(r, 0)).join('')}</div>
        <div class="row">
          <button id="addBone" ${sel ? '' : 'disabled'}>+ 加子骨骼</button>
          <button id="delBone" class="danger" ${sel && this.project.skeleton.length > 1 ? '' : 'disabled'}>删骨骼</button>
        </div>
      </section>
      <hr>
      <section ${sel ? '' : 'hidden'}>
        <h4>骨骼属性 · ${sel?.name ?? ''}</h4>
        <div class="col">
          <div><label>名称</label><input id="boneName" value="${sel?.name ?? ''}"></div>
          <div><label>父骨骼</label>
            <select id="boneParent"><option value="">（根骨骼）</option>${parentOptions}</select>
          </div>
          <div class="num3">
            <div><label>位置 X</label><input type="number" step="0.01" id="px" value="${sel?.localPos[0].toFixed(3) ?? 0}"></div>
            <div><label>Y</label><input type="number" step="0.01" id="py" value="${sel?.localPos[1].toFixed(3) ?? 0}"></div>
            <div><label>Z</label><input type="number" step="0.01" id="pz" value="${sel?.localPos[2].toFixed(3) ?? 0}"></div>
          </div>
          <div class="num3">
            <div><label>旋转 X°</label><input type="number" step="1" id="rx" value="${euler[0]}"></div>
            <div><label>Y°</label><input type="number" step="1" id="ry" value="${euler[1]}"></div>
            <div><label>Z°</label><input type="number" step="1" id="rz" value="${euler[2]}"></div>
          </div>
          <div><label>骨段长度（显示用）</label><input type="number" step="0.01" id="blen" value="${sel?.length ?? 0.15}"></div>
        </div>
      </section>
    `;
  }

  private paintPanelHTML(): string {
    const sel = this.project.skeleton[this.brushBoneIndex];
    const unpainted = this.project.mesh ? countUnpainted(this.project.mesh) : 0;
    const total = this.project.mesh ? this.project.mesh.positions.length / 3 : 0;
    return `
      <section>
        <h4>权重笔刷</h4>
        <div class="col">
          <div class="warn ${this.project.mesh ? '' : 'show'}">${this.project.mesh ? '' : '⚠ 还没有网格，请先到骨架模式生成或导入'}</div>
          <div><label>笔刷绑定骨骼（颜色即影响范围色）</label>
            <select id="brushBone">
              ${this.project.skeleton.map((b, i) =>
                `<option value="${i}" ${i === this.brushBoneIndex ? 'selected' : ''}>${b.name}</option>`).join('')}
            </select>
          </div>
          <div class="brush-swatch" id="brushSwatch"></div>
          <div><label>笔刷权重值 <b id="brushValTxt">${this.brushValue.toFixed(2)}</b></label>
            <input type="range" id="brushVal" min="0.05" max="1" step="0.05" value="${this.brushValue}">
          </div>
          <label class="ck"><input type="checkbox" id="brushReplace" ${this.brushReplace ? 'checked' : ''}> 替换模式（清空其它骨骼权重）</label>
          <button id="normalizeAll">全部归一化</button>
          <button id="autoWeight">按最近骨段自动刷权重</button>
          <div class="weight-stat">
            <div>顶点总数 <b>${total}</b></div>
            <div>权重未刷满（标红）<b id="unpaintedCount" class="rw">${unpainted}</b></div>
          </div>
          <p class="small">在视口点击/拖过顶点即可刷权重；未刷满的顶点实时标红，网格按骨骼颜色显示影响范围。</p>
        </div>
      </section>
      <hr>
      <section>
        <h4>显示</h4>
        <label class="ck"><input type="checkbox" id="wColor" ${this.project.showWeightColor ? 'checked' : ''}> 骨骼颜色影响范围</label>
        <label class="ck"><input type="checkbox" id="wMesh" ${this.project.showMesh ? 'checked' : ''}> 显示网格</label>
        <label class="ck"><input type="checkbox" id="wBones" ${this.project.showBones ? 'checked' : ''}> 显示骨骼</label>
      </section>
    `;
  }

  private animatePanelHTML(): string {
    const sel = this.project.skeleton.find((b) => b.id === this.selectedBoneId);
    const track = sel ? getTrack(this.clip, sel.id) : undefined;
    const keyHere = track?.keys.find((k) => Math.abs(k.time - this.currentTime) < 1 / this.clip.fps / 2);
    return `
      <section>
        <h4>动作版本</h4>
        <div class="col">
          <select id="versionSel">
            ${this.project.versions.map((v) =>
              `<option value="${v.id}" ${v.id === this.project.activeVersionId ? 'selected' : ''}>${v.label} · ${totalKeyCount(v.clip)} 帧键</option>`).join('')}
          </select>
          <div class="row">
            <button id="newVersion">+ 存为新版本</button>
            <button id="renameVersion">重命名</button>
          </div>
          <div class="small">时长 ${this.clip.duration}s · ${this.clip.fps}fps · 共 ${Math.round(this.clip.duration * this.clip.fps) + 1} 帧</div>
          <div class="row">
            <label class="small" style="margin:0">时长(s)</label>
            <input type="number" id="durInput" min="0.5" step="0.5" value="${this.clip.duration}">
          </div>
        </div>
      </section>
      <hr>
      <section>
        <h4>当前姿势</h4>
        <div class="col">
          <div><label>选择骨骼</label>
            <select id="animBoneSel">
              <option value="">（未选择）</option>
              ${this.project.skeleton.map((b) =>
                `<option value="${b.id}" ${b.id === this.selectedBoneId ? 'selected' : ''}>${b.name}</option>`).join('')}
            </select>
          </div>
          <div class="small">时间 ${this.currentTime.toFixed(2)}s / 帧 ${Math.round(this.currentTime * this.clip.fps)}</div>
          <button id="keyBtn" class="primary" ${sel ? '' : 'disabled'}>${keyHere ? '更新当前帧关键帧' : '打关键帧（位移+旋转）'}</button>
          <button id="delKeyBtn" class="danger" ${keyHere ? '' : 'disabled'}>删除当前帧关键帧</button>
          <div class="row">
            <button id="copyPoseBtn" ${sel ? '' : 'disabled'}>复制此帧姿势</button>
            <button id="pastePoseBtn" ${this.poseSnapshot ? '' : 'disabled'}>粘贴到当前时间</button>
          </div>
          ${this.poseSnapshot ? `<div class="small">剪贴板：${this.poseSnapshot.bones.length} 根骨骼 @ ${this.poseSnapshot.time.toFixed(2)}s</div>` : ''}
        </div>
      </section>
      <hr>
      <section>
        <h4>显示与检测</h4>
        <label class="ck"><input type="checkbox" id="aPen" ${this.project.showPenetration ? 'checked' : ''}> 脚底穿地标红</label>
        <label class="ck"><input type="checkbox" id="aMesh" ${this.project.showMesh ? 'checked' : ''}> 显示网格</label>
        <label class="ck"><input type="checkbox" id="aBones" ${this.project.showBones ? 'checked' : ''}> 显示骨骼</label>
        <div class="row"><label class="small" style="margin:0">地面高度 Y</label>
          <input type="number" id="groundY" step="0.05" value="${this.project.groundY}"></div>
        <div id="penStat" class="small"></div>
      </section>
      <hr>
      <section>
        <h4>导出</h4>
        <div class="col">
          <button id="exportBtn" class="success">导出 PNG 序列帧 + 关键帧数据</button>
          <div id="exportProgress" class="small"></div>
          <div class="export-list">
            ${this.version.exports.map((e) =>
              `<div class="small">📦 ${e.zipName}<br>帧 ${e.startFrame}–${e.startFrame + e.frameCount - 1} · ${e.frameCount} 帧 · ${new Date(e.at).toLocaleString()}</div>`
            ).join('') || '<div class="small">暂无导出记录</div>'}
          </div>
        </div>
      </section>
    `;
  }

  private bindLeftPanel() {
    const panel = this.$('#leftPanel')!;
    panel.querySelectorAll<HTMLElement>('.tree-row').forEach((r) => r.addEventListener('click', () => {
      this.selectedBoneId = r.dataset.bone!;
      this.viewport?.updateState(this.vpState());
      this.renderLeftPanel();
    }));

    // rig
    this.$('#genMesh')?.addEventListener('click', () => {
      this.project.mesh = buildDefaultMesh(this.project.skeleton);
      this.viewport?.updateProject(this.project);
      toast('已生成默认网格并自动刷权重', 'ok');
      this.renderLeftPanel();
    });
    (this.$('#objFile') as HTMLInputElement | null)?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const mesh = parseOBJ(String(reader.result), file.name);
          this.project.mesh = mesh;
          this.viewport?.updateProject(this.project);
          toast(`已导入 ${file.name}（${mesh.positions.length / 3} 顶点），请到权重模式刷权重`, 'ok');
          this.mode = 'paint';
          this.render();
        } catch (err) {
          toast('OBJ 解析失败：' + (err as Error).message, 'err');
        }
      };
      reader.readAsText(file);
    });
    this.$('#addBone')?.addEventListener('click', () => {
      const parent = this.project.skeleton.find((b) => b.id === this.selectedBoneId)!;
      const at: Vec3 = v3.add(parent.localPos, [0, parent.length || 0.15, 0]);
      const nb: Bone = {
        id: 'bone_' + Math.random().toString(36).slice(2, 9),
        name: `骨骼${this.project.skeleton.length + 1}`,
        parentId: parent.id,
        localPos: at, localRot: q.identity(),
        length: 0.15,
        color: [0.8, 0.8, 0.8]
      };
      this.project.skeleton.push(nb);
      this.selectedBoneId = nb.id;
      this.viewport?.updateState(this.vpState());
      this.renderLeftPanel();
    });
    this.$('#delBone')?.addEventListener('click', () => {
      if (!this.selectedBoneId) return;
      this.project.skeleton = deleteBone(this.project.skeleton, this.selectedBoneId);
      this.selectedBoneId = null;
      this.viewport?.updateState(this.vpState());
      this.renderLeftPanel();
    });
    this.$('#boneName')?.addEventListener('change', (e) => {
      const b = this.selBone(); if (b) b.name = (e.target as HTMLInputElement).value;
      this.renderLeftPanel();
    });
    this.$('#boneParent')?.addEventListener('change', (e) => {
      const b = this.selBone(); if (!b) return;
      const v = (e.target as HTMLSelectElement).value;
      b.parentId = v || null;
      this.viewport?.updateState(this.vpState());
      this.renderLeftPanel();
    });
    ['px', 'py', 'pz'].forEach((id, i) => this.$('#' + id)?.addEventListener('change', (e) => {
      const b = this.selBone(); if (!b) return;
      b.localPos[i] = +(e.target as HTMLInputElement).value;
      this.viewport?.updateState(this.vpState());
    }));
    ['rx', 'ry', 'rz'].forEach((id, i) => this.$('#' + id)?.addEventListener('change', (e) => {
      const b = this.selBone(); if (!b) return;
      const deg = [+(this.$('#rx') as HTMLInputElement).value, +(this.$('#ry') as HTMLInputElement).value, +(this.$('#rz') as HTMLInputElement).value];
      const rad: Vec3 = [deg[0] * Math.PI / 180, deg[1] * Math.PI / 180, deg[2] * Math.PI / 180];
      b.localRot = q.fromEuler(rad[0], rad[1], rad[2]);
      void i;
      this.viewport?.updateState(this.vpState());
    }));
    this.$('#blen')?.addEventListener('change', (e) => {
      const b = this.selBone(); if (b) b.length = +(e.target as HTMLInputElement).value;
    });
    this.$('#showMesh')?.addEventListener('change', (e) => { this.project.showMesh = (e.target as HTMLInputElement).checked; this.viewport?.requestRender(); });
    this.$('#showBones')?.addEventListener('change', (e) => { this.project.showBones = (e.target as HTMLInputElement).checked; this.viewport?.requestRender(); });

    // paint
    this.$('#brushBone')?.addEventListener('change', (e) => {
      this.brushBoneIndex = +(e.target as HTMLSelectElement).value;
      this.viewport?.updateState(this.vpState());
      this.updateBrushSwatch();
    });
    this.$('#brushVal')?.addEventListener('input', (e) => {
      this.brushValue = +(e.target as HTMLInputElement).value;
      (this.$('#brushValTxt') as HTMLElement).textContent = this.brushValue.toFixed(2);
      this.viewport?.updateState(this.vpState());
    });
    this.$('#brushReplace')?.addEventListener('change', (e) => {
      this.brushReplace = (e.target as HTMLInputElement).checked;
      this.viewport?.updateState(this.vpState());
    });
    this.$('#normalizeAll')?.addEventListener('click', () => {
      if (!this.project.mesh) return;
      normalizeAll(this.project.mesh);
      this.viewport?.renderer.refreshMeshDynamic(this.project.mesh);
      this.renderLeftPanel();
      toast('全部顶点权重已归一化', 'ok');
    });
    this.$('#autoWeight')?.addEventListener('click', () => {
      if (!this.project.mesh) return;
      autoWeight(this.project.mesh, this.project.skeleton);
      this.viewport?.renderer.refreshMeshDynamic(this.project.mesh);
      this.renderLeftPanel();
      toast('已按最近骨段自动刷权重', 'ok');
    });
    this.$('#wColor')?.addEventListener('change', (e) => { this.project.showWeightColor = (e.target as HTMLInputElement).checked; this.viewport?.requestRender(); });
    this.$('#wMesh')?.addEventListener('change', (e) => { this.project.showMesh = (e.target as HTMLInputElement).checked; this.viewport?.requestRender(); });
    this.$('#wBones')?.addEventListener('change', (e) => { this.project.showBones = (e.target as HTMLInputElement).checked; this.viewport?.requestRender(); });
    this.updateBrushSwatch();

    // animate
    this.$('#animBoneSel')?.addEventListener('change', (e) => {
      this.selectedBoneId = (e.target as HTMLSelectElement).value || null;
      this.viewport?.updateState(this.vpState());
      this.renderLeftPanel();
    });
    this.$('#versionSel')?.addEventListener('change', (e) => {
      this.stopPlay();
      this.project.activeVersionId = (e.target as HTMLSelectElement).value;
      this.currentTime = 0;
      this.timeline?.setClip(this.clip);
      this.viewport?.updateState(this.vpState());
      this.renderLeftPanel();
    });
    this.$('#newVersion')?.addEventListener('click', () => this.newVersion());
    this.$('#renameVersion')?.addEventListener('click', () => {
      const v = this.version;
      const m = modal('重命名版本', `<div class="col"><input id="nv" value="${v.label}">
        <div class="row" style="justify-content:flex-end"><button id="c">取消</button><button id="ok" class="primary">确定</button></div></div>`);
      m.root.querySelector('#c')!.addEventListener('click', m.close);
      m.root.querySelector('#ok')!.addEventListener('click', () => {
        v.label = (m.root.querySelector('#nv') as HTMLInputElement).value || v.label;
        m.close(); this.renderLeftPanel();
      });
    });
    this.$('#durInput')?.addEventListener('change', (e) => {
      this.clip.duration = Math.max(0.5, +(e.target as HTMLInputElement).value);
      this.timeline?.setClip(this.clip);
      this.renderLeftPanel();
    });
    this.$('#keyBtn')?.addEventListener('click', () => this.addKeyframe());
    this.$('#delKeyBtn')?.addEventListener('click', () => this.removeKeyframe());
    this.$('#copyPoseBtn')?.addEventListener('click', () => {
      this.poseSnapshot = copyPoseAt(this.clip, this.currentTime);
      // 若当前时间没有任何关键帧，sampleClip 得到空 pose，改为复制当前视口姿势
      if (!this.poseSnapshot.bones.length && this.selectedBoneId) {
        const pose = this.vpState().pose;
        this.poseSnapshot = {
          time: this.currentTime,
          bones: this.project.skeleton.filter((b) => pose.positions.has(b.id)).map((b) => ({
            boneId: b.id,
            pos: pose.positions.get(b.id) ?? b.localPos,
            rot: pose.rotations.get(b.id) ?? b.localRot
          }))
        };
      }
      this.renderLeftPanel();
      toast('姿势已复制', 'ok');
    });
    this.$('#pastePoseBtn')?.addEventListener('click', () => {
      if (!this.poseSnapshot) return;
      pastePose(this.clip, this.poseSnapshot, this.currentTime);
      this.timeline?.setClip(this.clip);
      this.viewport?.updateState(this.vpState());
      this.renderLeftPanel();
      toast(`已粘贴到 ${this.currentTime.toFixed(2)}s`, 'ok');
    });
    this.$('#aPen')?.addEventListener('change', (e) => { this.project.showPenetration = (e.target as HTMLInputElement).checked; this.viewport?.requestRender(); });
    this.$('#aMesh')?.addEventListener('change', (e) => { this.project.showMesh = (e.target as HTMLInputElement).checked; this.viewport?.requestRender(); });
    this.$('#aBones')?.addEventListener('change', (e) => { this.project.showBones = (e.target as HTMLInputElement).checked; this.viewport?.requestRender(); });
    this.$('#groundY')?.addEventListener('change', (e) => {
      this.project.groundY = +(e.target as HTMLInputElement).value;
      this.viewport?.requestRender();
      this.updatePenStat();
    });
    this.$('#exportBtn')?.addEventListener('click', () => this.doExport());
    this.updatePenStat();
  }

  private selBone(): Bone | undefined {
    return this.project.skeleton.find((b) => b.id === this.selectedBoneId);
  }

  private updateBrushSwatch() {
    const el = this.$('#brushSwatch');
    if (!el) return;
    const b = this.project.skeleton[this.brushBoneIndex];
    if (b) el.style.background = `rgb(${b.color.map((c) => Math.round(c * 255)).join(',')})`;
  }

  private updatePenStat() {
    const el = this.$('#penStat');
    if (!el || !this.viewport || !this.project.mesh) return;
    const stat = this.viewport.penetration();
    if (!stat) { el.textContent = ''; return; }
    el.innerHTML = stat.count > 0
      ? `<span style="color:var(--danger)">⚠ ${stat.count} 个顶点穿地，最低点 Y=${stat.minY.toFixed(3)}</span>`
      : `<span style="color:var(--accent2)">✓ 无穿地，最低点 Y=${stat.minY.toFixed(3)}</span>`;
  }

  // ===== 视口条 =====
  private renderViewportBar() {
    const bar = this.$('#viewportBar');
    if (!bar) return;
    bar.innerHTML = `
      <div class="row">
        <button id="camReset">重置镜头</button>
        ${this.mode !== 'paint' ? `
          <button id="gizmoRotate" class="${this.gizmoMode === 'rotate' ? 'primary' : ''}">旋转 Gizmo</button>
          <button id="gizmoTranslate" class="${this.gizmoMode === 'translate' ? 'primary' : ''}">位移 Gizmo</button>
        ` : '<span class="small">权重模式：点击/拖拽顶点刷权重</span>'}
      </div>
      <div class="small">左键旋转视角 · Shift/右键平移 · 滚轮缩放 · 点骨骼选中</div>
    `;
    this.$('#camReset')!.addEventListener('click', () => this.viewport?.resetCamera());
    this.$('#gizmoRotate')?.addEventListener('click', () => { this.gizmoMode = 'rotate'; this.viewport?.updateState(this.vpState()); this.renderViewportBar(); });
    this.$('#gizmoTranslate')?.addEventListener('click', () => { this.gizmoMode = 'translate'; this.viewport?.updateState(this.vpState()); this.renderViewportBar(); });
  }

  // ===== 时间轴 =====
  private setupTimeline() {
    if (!this.timelineHost) return;
    if (this.mode !== 'animate') { this.timelineHost.hidden = true; return; }
    this.timelineHost.hidden = false;
    this.timeline = new Timeline(this.timelineHost, this.clip, this.project.skeleton, {
      seek: (t) => { this.currentTime = t; this.viewport?.updateState(this.vpState()); this.timeline?.setTime(t); this.updatePenStat(); },
      moveKey: (boneId, keyId, t) => {
        moveKey(this.clip, boneId, keyId, t);
        this.timeline?.setTime(this.currentTime);
      },
      selectKey: (boneId, keyId) => {
        if (boneId) {
          this.selectedBoneId = boneId;
          const k = getTrack(this.clip, boneId)?.keys.find((x) => x.id === keyId);
          if (k) { this.currentTime = k.time; this.viewport?.updateState(this.vpState()); }
        }
        this.renderLeftPanel();
      },
      togglePlay: () => this.togglePlay(),
      setFps: (fps) => { this.clip.fps = fps; this.timeline?.setClip(this.clip); this.renderLeftPanel(); }
    });
    this.timeline.setTime(this.currentTime);
  }

  private togglePlay() {
    if (this.playTimer !== null) { this.stopPlay(); return; }
    this.timeline?.setPlaying(true);
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      this.currentTime += dt;
      if (this.currentTime >= this.clip.duration) {
        this.currentTime = this.clip.duration;
        this.stopPlay();
      }
      this.timeline?.setTime(this.currentTime);
      this.viewport?.updateState(this.vpState());
      this.updatePenStat();
      if (this.playTimer !== null) this.playTimer = requestAnimationFrame(tick);
    };
    this.playTimer = requestAnimationFrame(tick);
  }

  private stopPlay() {
    if (this.playTimer !== null) cancelAnimationFrame(this.playTimer);
    this.playTimer = null;
    this.timeline?.setPlaying(false);
  }

  // ===== 关键帧 =====
  private addKeyframe() {
    const b = this.selBone();
    if (!b) return;
    const pose = this.vpState().pose;
    const pos = pose.positions.get(b.id) ?? b.localPos;
    const rot = pose.rotations.get(b.id) ?? b.localRot;
    const track = getTrack(this.clip, b.id);
    const existing = track?.keys.find((k) => Math.abs(k.time - this.currentTime) < 1e-3);
    if (existing) {
      existing.pos = [...pos] as Vec3;
      existing.rot = q.copy(rot);
      toast('当前帧关键帧已更新', 'ok');
    } else {
      upsertKey(this.clip, b.id, makeKey(this.currentTime, [...pos] as Vec3, q.copy(rot)));
      toast(`已在 ${this.currentTime.toFixed(2)}s 打关键帧`, 'ok');
    }
    this.timeline?.setClip(this.clip);
    this.renderLeftPanel();
  }

  private removeKeyframe() {
    const b = this.selBone();
    if (!b) return;
    const track = getTrack(this.clip, b.id);
    const k = track?.keys.find((x) => Math.abs(x.time - this.currentTime) < 1 / this.clip.fps / 2);
    if (k) {
      deleteKey(this.clip, b.id, k.id);
      this.timeline?.setClip(this.clip);
      this.viewport?.updateState(this.vpState());
      this.renderLeftPanel();
      toast('关键帧已删除', 'ok');
    }
  }

  // ===== 版本 =====
  private newVersion() {
    const clip = cloneClip(this.clip);
    const n = this.project.versions.length + 1;
    clip.name = `主动作 v${n}`;
    const ver = createVersion(`v${n}`, clip);
    this.project.versions.push(ver);
    this.project.activeVersionId = ver.id;
    this.currentTime = 0;
    this.timeline?.setClip(this.clip);
    this.viewport?.updateState(this.vpState());
    this.renderLeftPanel();
    toast(`已创建新版本 v${n}`, 'ok');
  }

  // ===== 导出 =====
  private async doExport() {
    if (!this.viewport || this.exporting) return;
    if (!this.project.mesh) { toast('请先准备网格', 'err'); return; }
    this.exporting = true;
    const startFrame = nextStartFrame(this.version.exports);
    const prog = this.$('#exportProgress') as HTMLElement;
    prog.textContent = '导出中…';
    this.stopPlay();
    const savedTime = this.currentTime;
    try {
      const { record, blob } = await exportSequence(this.viewport, this.project, this.clip, startFrame, (done, total) => {
        prog.textContent = `渲染帧 ${done}/${total}`;
      });
      downloadBlob(blob, record.zipName);
      this.version.exports.push(record);
      this.renderLeftPanel();
      const prog2 = this.$('#exportProgress');
      if (prog2) prog2.textContent = `✓ 完成：${record.frameCount} 帧，帧号 ${record.startFrame}–${record.startFrame + record.frameCount - 1}（再导出沿用同一起点对齐）`;
      toast('PNG 序列帧 + 关键帧数据已打包下载', 'ok');
    } catch (e) {
      prog.textContent = '导出失败：' + (e as Error).message;
    } finally {
      this.exporting = false;
      this.currentTime = savedTime;
      this.viewport.setPose(this.currentPose());
    }
  }

  private save() {
    if (this.readonly) return;
    store.saveProject(this.project);
    toast('项目已保存', 'ok');
  }

  private back() {
    this.stopPlay();
    this.viewport?.dispose();
    window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'orders' } }));
  }

  disconnectedCallback() {
    this.stopPlay();
    this.viewport?.dispose();
    super.disconnectedCallback();
  }

  private css(): string {
    return `
      .editor { display:flex; flex-direction:column; height:100%; }
      .toolbar { display:flex; align-items:center; gap:10px; padding:8px 14px; background:#22272e; border-bottom:1px solid var(--line); }
      .toolbar .title { font-size:14px; }
      .spacer { flex:1; }
      .modes { display:flex; gap:6px; }
      .body { flex:1; display:flex; min-height:0; }
      .left { width:300px; flex:none; background:var(--panel); border-right:1px solid var(--line); padding:14px; }
      .left section h4 { margin-bottom:10px; font-size:13px; }
      .center { flex:1; display:flex; flex-direction:column; min-width:0; }
      .viewport-bar { display:flex; justify-content:space-between; align-items:center; padding:6px 12px; background:#22272e; border-bottom:1px solid var(--line); gap:10px; flex-wrap:wrap; }
      #glcanvas { flex:1; min-height:0; width:100%; display:block; touch-action:none; }
      .timeline-host { height:260px; flex:none; background:#262b33; border-top:1px solid var(--line); display:flex; flex-direction:column; }
      .tree { max-height:230px; border:1px solid var(--line); border-radius:6px; margin-bottom:8px; }
      .tree-row { display:flex; align-items:center; gap:7px; padding:5px 8px; cursor:pointer; white-space:nowrap; }
      .tree-row:hover { background:var(--panel2); }
      .tree-row.sel { background:#35507a; }
      .dot { width:10px; height:10px; border-radius:50%; flex:none; }
      .tname { font-size:12px; }
      .num3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; }
      .num3 label { font-size:11px; }
      .ck { display:flex; align-items:center; gap:6px; color:var(--muted); font-size:12px; margin:0; }
      .ck input { width:auto; }
      .file-btn { display:inline-block; text-align:center; border:1px solid var(--line); border-radius:6px; padding:6px 12px; background:var(--panel2); cursor:pointer; }
      .file-btn:hover { background:#39404b; }
      .brush-swatch { height:34px; border-radius:6px; border:1px solid var(--line); }
      .weight-stat { display:flex; justify-content:space-between; background:var(--panel2); border-radius:6px; padding:8px 10px; font-size:12px; color:var(--muted); }
      .weight-stat .rw { color:var(--danger); }
      .warn.show { color:var(--warn); font-size:12px; }
      .export-list { display:flex; flex-direction:column; gap:6px; max-height:140px; overflow:auto; }
      .export-list > div { background:var(--panel2); padding:6px 8px; border-radius:6px; line-height:1.5; }
    `;
  }
}

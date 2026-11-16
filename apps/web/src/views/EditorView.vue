<template>
  <div class="editor-shell">
    <header class="topbar">
      <div class="title">
        <el-button text @click="$router.push('/projects')">← 项目</el-button>
        <strong>{{ store.modelName }}</strong>
        <el-tag size="small" :type="renderMode === 'webgpu' ? 'success' : 'warning'">
          {{ renderMode === 'webgpu' ? 'WebGPU' : 'WebGL2 回退' }}
        </el-tag>
        <el-tag v-if="store.dirty" size="small" type="info">未保存</el-tag>
      </div>
      <div class="actions">
        <el-button @click="store.resetDemo()">重置演示</el-button>
        <el-button type="primary" :disabled="!canSave" @click="saveVersion">
          保存 v{{ nextVersion }}
        </el-button>
        <el-button :disabled="!lastOutput" @click="goFlat">下料图</el-button>
      </div>
    </header>

    <div class="body">
      <canvas ref="canvasRef" class="canvas"></canvas>

      <aside class="sidebar">
        <el-tabs>
          <el-tab-pane label="样条">
            <el-form label-width="92px" size="small">
              <el-form-item label="插值方式">
                <el-select
                  :model-value="store.interpolation"
                  @update:model-value="store.setInterpolation"
                >
                  <el-option label="折线线性" value="linear" />
                  <el-option label="Catmull-Rom 向心" value="catmullRom" />
                  <el-option label="分段三次 Bézier" value="bezier" />
                  <el-option label="NURBS（权重生效）" value="nurbs" />
                </el-select>
              </el-form-item>
              <el-form-item label="显示内层">
                <el-switch v-model="store.showInner" />
              </el-form-item>
              <el-form-item label="显示外层">
                <el-switch v-model="store.showOuter" />
              </el-form-item>
              <el-form-item label="曲率梳">
                <el-switch v-model="store.showComb" />
              </el-form-item>
            </el-form>

            <el-divider>控制点（{{ store.controlPoints.length }}）</el-divider>
            <el-button size="small" @click="store.addPointAfter(store.selectedId)">
              ＋ 插入点
            </el-button>
            <el-button
              size="small"
              type="danger"
              plain
              :disabled="!store.selected || store.controlPoints.length <= 2"
              @click="store.selected && store.removePoint(store.selected.id)"
            >
              删除选中
            </el-button>

            <div v-if="store.selected" class="point-editor">
              <el-divider>选中点</el-divider>
              <el-form label-width="92px" size="small">
                <el-form-item label="所属关节">
                  <el-select
                    :model-value="store.selected.jointId"
                    @update:model-value="(v: string) => store.updatePoint(store.selected!.id, { jointId: v })"
                  >
                    <el-option v-for="j in jointOptions" :key="j" :label="j" :value="j" />
                  </el-select>
                </el-form-item>
                <el-form-item v-for="(axis, i) in axes" :key="axis" :label="axis + ' 坐标'">
                  <el-input-number
                    :model-value="store.selected.position[i]"
                    :step="5"
                    @update:model-value="(v: number) => updateCoord(i, v)"
                  />
                </el-form-item>
                <el-form-item label="权重">
                  <el-slider
                    :model-value="store.selected.weight"
                    :min="0.1"
                    :max="8"
                    :step="0.1"
                    @update:model-value="(v: number) => store.updatePoint(store.selected!.id, { weight: v })"
                  />
                  <span class="num">{{ store.selected.weight.toFixed(1) }}</span>
                </el-form-item>
                <el-form-item label="注释">
                  <el-input
                    :model-value="store.selected.note ?? ''"
                    placeholder="该点工艺注释"
                    @update:model-value="(v: string) => store.updatePoint(store.selected!.id, { note: v })"
                  />
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <el-tab-pane label="规则">
            <el-form label-width="118px" size="small">
              <el-form-item label="护套外径 mm">
                <el-input-number
                  :model-value="store.rules.outerDiameter"
                  :min="5"
                  :max="200"
                  @update:model-value="(v: number) => store.updateRules({ outerDiameter: v })"
                />
              </el-form-item>
              <el-form-item label="壁厚 mm">
                <el-input-number
                  :model-value="store.rules.wallThickness"
                  :min="0.5"
                  :max="20"
                  :step="0.5"
                  @update:model-value="(v: number) => store.updateRules({ wallThickness: v })"
                />
              </el-form-item>
              <el-form-item label="弯曲半径系数">
                <el-input-number
                  :model-value="store.rules.bendRadiusFactor"
                  :min="1"
                  :max="12"
                  :step="0.5"
                  @update:model-value="(v: number) => store.updateRules({ bendRadiusFactor: v })"
                />
              </el-form-item>
              <el-form-item label="最小层间隙 mm">
                <el-input-number
                  :model-value="store.rules.minLayerGap"
                  :min="0"
                  :max="20"
                  :step="0.1"
                  @update:model-value="(v: number) => store.updateRules({ minLayerGap: v })"
                />
              </el-form-item>
              <el-form-item label="命名模板">
                <el-input
                  :model-value="store.rules.segmentNameTemplate"
                  @update:model-value="(v: string) => store.updateRules({ segmentNameTemplate: v })"
                />
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="关节">
            <el-form label-width="60px" size="small">
              <el-form-item v-for="j in jointOptions" :key="j" :label="j">
                <el-slider
                  :model-value="degrees(store.jointAngles[j])"
                  :min="-180"
                  :max="180"
                  :step="1"
                  @update:model-value="(v: number) => store.setJointAngle(j, (v * Math.PI) / 180)"
                />
                <span class="num">{{ degrees(store.jointAngles[j]).toFixed(0) }}°</span>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="检查">
            <inspection-panel :output="lastOutput!" :rules="store.rules" />
          </el-tab-pane>
        </el-tabs>
      </aside>
    </div>

    <GapBadge v-if="lastOutput" :output="lastOutput!" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { Vec3 } from '@pg/shared';
import { buildEnvelopes, DEFAULT_6AXIS_ROBOT } from '@pg/robot';
import type { PipelineOutput } from '@pg/geom-kernel';
import { createRenderer, createScene } from '../three/renderer.js';
import { SceneController } from '../three/scene-controller.js';
import { useEditorStore } from '../stores/editor.js';
import { api } from '../api/client.js';
import InspectionPanel from '../components/InspectionPanel.vue';
import GapBadge from '../components/GapBadge.vue';

const store = useEditorStore();
const route = useRoute();
const router = useRouter();
const canvasRef = ref<HTMLCanvasElement>();
const renderMode = ref<'webgpu' | 'webgl2'>('webgl2');
const lastOutput = ref<PipelineOutput | null>(null);
const nextVersion = ref(1);
const canSave = computed(() => store.controlPoints.length >= 2 && !!store.projectId);

const jointOptions = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6'];
const axes = ['X', 'Y', 'Z'] as const;
const degrees = (rad?: number) => ((rad ?? 0) * 180) / Math.PI;

let sceneController: SceneController | null = null;
let raf = 0;
let rebuildTimer: ReturnType<typeof setTimeout> | null = null;

function rebuild() {
  if (!sceneController) return;
  const envelopes = buildEnvelopes(DEFAULT_6AXIS_ROBOT, store.jointAngles);
  lastOutput.value = sceneController.rebuild(
    store.controlPoints,
    store.interpolation,
    store.rules,
    store.projectCode,
    envelopes,
    { showInner: store.showInner, showOuter: store.showOuter, showComb: store.showComb },
  );
}

function scheduleRebuild() {
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(rebuild, 50);
}

function updateCoord(axisIndex: number, value: number) {
  if (!store.selected) return;
  const pos: Vec3 = [...store.selected.position] as Vec3;
  pos[axisIndex] = value;
  store.movePoint(store.selected.id, pos);
}

async function saveVersion() {
  if (!store.projectId) return;
  try {
    const saved = await api.saveVersion(store.projectId, store.model, '编辑器保存');
    nextVersion.value = saved.version + 1;
    store.markSaved();
    ElMessage.success(`已保存 v${saved.version}`);
  } catch (e) {
    ElMessage.error((e as Error).message);
  }
}

function goFlat() {
  if (store.projectId) router.push(`/projects/${store.projectId}/flat`);
}

watch(
  () => [
    store.controlPoints,
    store.interpolation,
    store.rules,
    store.jointAngles,
    store.showInner,
    store.showOuter,
    store.showComb,
  ],
  scheduleRebuild,
  { deep: true },
);

onMounted(async () => {
  const canvas = canvasRef.value!;
  const { renderer, mode } = await createRenderer(canvas);
  renderMode.value = mode;
  const { scene, camera, controls, resize } = createScene(canvas, renderer);
  sceneController = new SceneController(scene, camera, canvas);

  sceneController.controller.onDrag = (id, position) => {
    store.movePoint(id, position);
    if (store.selectedId !== id) store.select(id);
  };
  sceneController.controller.onSelect = (id) => store.select(id);
  sceneController.controller.onRequestAdd = () => store.addPointAfter(store.selectedId);

  const projectId = String(route.params.id ?? '');
  if (projectId && projectId !== 'new') {
    try {
      const [project, versions] = await Promise.all([
        api.projectDetail(projectId),
        api.listVersions(projectId),
      ]);
      store.projectId = project.id;
      store.projectCode = project.code;
      store.modelName = project.name;
      nextVersion.value = project.currentVersion + 1;
      const latest = versions[0];
      if (latest) store.loadModel(latest.model, project.id, project.code);
    } catch (e) {
      ElMessage.warning(`加载项目失败，进入本地演示模式：${(e as Error).message}`);
    }
  }

  rebuild();
  const loop = () => {
    resize();
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  loop();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  if (rebuildTimer) clearTimeout(rebuildTimer);
  sceneController?.dispose();
});
</script>

<style scoped>
.editor-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
}
.title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.actions {
  display: flex;
  gap: 8px;
}
.body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.canvas {
  flex: 1;
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}
.sidebar {
  width: 350px;
  background: white;
  border-left: 1px solid #e4e7ed;
  overflow-y: auto;
  padding: 0 12px;
}
.point-editor {
  margin-top: 8px;
}
.num {
  margin-left: 8px;
  color: #606266;
  font-variant-numeric: tabular-nums;
}
</style>

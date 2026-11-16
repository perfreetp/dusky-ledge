<template>
  <div class="app">
    <header>
      <h1>太湖石体素建模与档案加工工具</h1>
      <div class="head-stats">
        <span>体素 {{ store.mesh.voxels.toLocaleString() }}</span>
        <span>体积 {{ store.mesh.volume.toFixed(3) }} m³</span>
        <span>合并 {{ store.mesh.facesRaw.toLocaleString() }} 面</span>
        <span class="accent">减面 {{ store.mesh.faces.toLocaleString() }} 面({{ Math.round(store.decimation * 100) }}%)</span>
      </div>
      <div class="head-stone" v-if="currentStone">
        当前石块:{{ currentStone.code }} · {{ currentStone.origin }}
      </div>
    </header>
    <main>
      <aside class="left">
        <ToolPanel />
      </aside>
      <section class="center">
        <div class="view3d"><Viewport3D /></div>
        <div class="view2d"><LayerEditor /></div>
      </section>
      <aside class="right">
        <ArchivePanel />
      </aside>
    </main>
    <div v-if="store.notice" class="toast">{{ store.notice }}</div>
    <RecordSheet />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { store } from './store'
import Viewport3D from './components/Viewport3D.vue'
import LayerEditor from './components/LayerEditor.vue'
import ToolPanel from './components/ToolPanel.vue'
import ArchivePanel from './components/ArchivePanel.vue'
import RecordSheet from './components/RecordSheet.vue'

const currentStone = computed(() => store.stones.find((s) => s.id === store.currentStoneId))
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
header {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 8px 14px;
  background: #1b1f27;
  border-bottom: 1px solid #2a303c;
}
header h1 {
  font-size: 15px;
  margin: 0;
  color: #e6edf7;
  white-space: nowrap;
}
.head-stats {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: #8fa3c0;
}
.head-stats .accent {
  color: #6fb7ff;
  font-weight: 600;
}
.head-stone {
  margin-left: auto;
  font-size: 12px;
  color: #d8c07a;
}
main {
  flex: 1;
  display: flex;
  min-height: 0;
}
aside.left {
  width: 250px;
  background: #181c24;
  border-right: 1px solid #262c38;
  overflow: hidden;
}
aside.right {
  width: 320px;
  background: #181c24;
  border-left: 1px solid #262c38;
}
.center {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.view3d {
  flex: 3;
  min-height: 0;
  border-bottom: 1px solid #262c38;
}
.view2d {
  flex: 2;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #2f5d95;
  color: #fff;
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 13px;
  z-index: 200;
}
</style>

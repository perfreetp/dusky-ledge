<script lang="ts">
  import { FEATURE_TYPES, LAYERS } from '../lib/config';
  import type { Feature } from '../lib/types';

  let {
    feature,
    x,
    y,
    onClose,
    onFly
  }: {
    feature: Feature;
    x: number;
    y: number;
    onClose: () => void;
    onFly: (f: Feature) => void;
  } = $props();

  const left = $derived(Math.min(x + 14, window.innerWidth - 280));
  const top = $derived(Math.min(y + 14, window.innerHeight - 260));
</script>

<div class="feature-card" style:left={left + 'px'} style:top={top + 'px'}>
  <div class="row">
    <h4>{feature.id}</h4>
    <div class="spacer"></div>
    <button class="icon-btn" onclick={onClose}>✕</button>
  </div>
  <dl>
    <dt>要素类型</dt>
    <dd>{FEATURE_TYPES[feature.type].label}</dd>
    <dt>所属图层</dt>
    <dd>{LAYERS.find((l) => l.id === feature.layer)?.name}</dd>
    <dt>编号</dt>
    <dd>{feature.id}</dd>
    <dt>投放日期</dt>
    <dd>{feature.deployDate}</dd>
    <dt>坐标</dt>
    <dd>({feature.x.toFixed(1)}, {feature.z.toFixed(1)}) m</dd>
    <dt>尺寸</dt>
    <dd>r={feature.radius.toFixed(1)} m · 深 {feature.depth.toFixed(1)} m</dd>
  </dl>
  <button class="primary fly-btn" onclick={() => onFly(feature)}>双击亦可飞行定位 ✈</button>
</div>

<style>
  .icon-btn {
    padding: 2px 8px;
    font-size: 12px;
  }
  .fly-btn {
    margin-top: 10px;
    width: 100%;
    font-size: 12px;
  }
</style>

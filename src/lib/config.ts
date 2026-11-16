import type { FeatureType, LayerId } from './types';

export const STORAGE_KEYS = {
  projects: 'dsf-projects-v1',
  session: 'dsf-session-v1'
};

/** 四个可独立开关的图层 */
export const LAYERS: { id: LayerId; name: string; color: number; cssColor: string }[] = [
  { id: 'cage', name: '网箱', color: 0xff9a3c, cssColor: '#ff9a3c' },
  { id: 'chain', name: '锚链', color: 0x9ad0ff, cssColor: '#9ad0ff' },
  { id: 'warning', name: '警戒区', color: 0xff5266, cssColor: '#ff5266' },
  { id: 'channel', name: '航道', color: 0x46d6e0, cssColor: '#46d6e0' }
];

export const FEATURE_TYPES: Record<
  FeatureType,
  { label: string; defaultLayer: LayerId; color: number }
> = {
  cage: { label: '网箱', defaultLayer: 'cage', color: 0xff9a3c },
  buoy: { label: '浮标', defaultLayer: 'cage', color: 0xffd257 },
  chain: { label: '锚链', defaultLayer: 'chain', color: 0x9ad0ff },
  marker: { label: '航标', defaultLayer: 'channel', color: 0x7cf2c8 },
  warningZone: { label: '警戒区', defaultLayer: 'warning', color: 0xff5266 },
  channel: { label: '航道', defaultLayer: 'channel', color: 0x46d6e0 }
};

/** LOD 距离档位（米）：<= NEAR 完整网格，<= FAR 简化网衣，其余只画包围盒 */
export const LOD = {
  NEAR: 450,
  FAR: 1500
};
export const LOD_SQ = {
  NEAR: LOD.NEAR * LOD.NEAR,
  FAR: LOD.FAR * LOD.FAR
};

export const MAX_REWORK = 3;

/** 初始相机 */
export const DEFAULT_CAMERA = {
  position: [1800, 1350, 1800] as const,
  target: [0, 0, 0] as const
};

export const SCENE = {
  fogColor: 0x071c2e,
  fogNear: 1400,
  fogFar: 4600,
  seaColor: 0x0d3b5c,
  floorY: -60
};

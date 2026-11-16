import { FEATURE_TYPES } from '../config';
import type { Feature, FeatureType, LayerId } from '../types';
import { mulberry32, padCode, randomDate } from '../utils/prng';

const TYPE_PREFIX: Record<FeatureType, string> = {
  cage: 'WX',
  buoy: 'FB',
  chain: 'ML',
  marker: 'HB',
  warningZone: 'JJ',
  channel: 'HD'
};

export interface GeneratedZone {
  features: Feature[];
  /** 场景参考半径（米），用于海面/地面尺寸 */
  extent: number;
  counts: Record<FeatureType, number>;
}

/**
 * 基于种子确定性生成一个养殖区的全部要素（约 1.2 万个）：
 * 网箱按区块阵列排布，浮标散布，锚链从区块中心拉向四向锚点，
 * 航标沿航道布置，外围布置警戒区与航道。
 */
export function generateZone(seed: number): GeneratedZone {
  const rng = mulberry32(seed);
  const features: Feature[] = [];
  const counters: Record<FeatureType, number> = {
    cage: 0,
    buoy: 0,
    chain: 0,
    marker: 0,
    warningZone: 0,
    channel: 0
  };

  const add = (type: FeatureType, partial: Omit<Feature, 'id' | 'type' | 'layer' | 'deployDate'> & {
    layer?: LayerId;
  }) => {
    counters[type]++;
    features.push({
      id: `${TYPE_PREFIX[type]}-${padCode(counters[type])}`,
      type,
      layer: partial.layer ?? FEATURE_TYPES[type].defaultLayer,
      deployDate: randomDate(rng, 30, 1200),
      ...partial
    });
  };

  // ---- 网箱区块：18 x 18 个区块，每区块 28 个网箱（4 x 7）----
  const BLOCKS = 18;
  const STEP = 120;
  const HALF = ((BLOCKS - 1) * STEP) / 2;
  const extent = HALF + 260;

  for (let bx = 0; bx < BLOCKS; bx++) {
    for (let bz = 0; bz < BLOCKS; bz++) {
      const cx = bx * STEP - HALF + (rng() - 0.5) * 14;
      const cz = bz * STEP - HALF + (rng() - 0.5) * 14;

      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 7; j++) {
          const x = cx + (i - 1.5) * 22 + (rng() - 0.5) * 3;
          const z = cz + (j - 3) * 11 + (rng() - 0.5) * 3;
          add('cage', {
            x,
            y: 0,
            z,
            radius: 9 + rng() * 2.5,
            depth: 22 + rng() * 22,
            heading: rng() * Math.PI * 2
          });
        }
      }

      // 每区块 1 个定位浮标 + 4 条锚链
      add('buoy', {
        x: cx,
        y: 0,
        z: cz,
        radius: 3.6 + rng() * 1.4,
        depth: 2,
        heading: rng() * Math.PI * 2
      });
      for (let k = 0; k < 4; k++) {
        const ang = (k / 4) * Math.PI * 2 + Math.PI / 4 + (rng() - 0.5) * 0.3;
        const len = 38 + rng() * 16;
        add('chain', {
          x: cx,
          y: 0,
          z: cz,
          radius: 2,
          depth: 28 + rng() * 20,
          heading: ang,
          extra: { ex: Math.cos(ang) * len, ez: Math.sin(ang) * len }
        });
      }
    }
  }

  // ---- 外围散布浮标 ----
  for (let i = 0; i < 1200; i++) {
    const ang = rng() * Math.PI * 2;
    const r = HALF + 40 + rng() * 220;
    add('buoy', {
      x: Math.cos(ang) * r,
      y: 0,
      z: Math.sin(ang) * r,
      radius: 3 + rng() * 2,
      depth: 2,
      heading: rng() * Math.PI * 2
    });
  }

  // ---- 航道：区块行之间的长条形通道，两侧布置航标 ----
  const channelRows = [3, 9, 15];
  for (const row of channelRows) {
    const z = row * STEP - HALF;
    add('channel', {
      x: 0,
      y: 0,
      z,
      radius: 32,
      depth: 0.5,
      heading: 0,
      extra: { sx: extent * 0.92, sz: 26 }
    });
    for (let k = 0; k < 26; k++) {
      const x = -extent * 0.85 + (k / 25) * extent * 1.7;
      for (const side of [-1, 1]) {
        add('marker', {
          x,
          y: 0,
          z: z + side * 30,
          radius: 3.2,
          depth: 8,
          heading: 0,
          extra: { sy: 8 }
        });
      }
    }
  }

  // ---- 警戒区：圈住若干区块组的大圆形半透明区域 ----
  for (let gx = 0; gx < 3; gx++) {
    for (let gz = 0; gz < 3; gz++) {
      const cx = (gx - 1) * STEP * 5.5;
      const cz = (gz - 1) * STEP * 5.5;
      add('warningZone', {
        x: cx,
        y: 0,
        z: cz,
        radius: 230 + rng() * 40,
        depth: 10,
        heading: 0
      });
    }
  }
  // 外围环形警戒
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    add('warningZone', {
      x: Math.cos(ang) * (HALF + 130),
      y: 0,
      z: Math.sin(ang) * (HALF + 130),
      radius: 90 + rng() * 30,
      depth: 8,
      heading: 0
    });
  }

  return { features, extent, counts: counters };
}

import type { Feature, FeatureKind, PlanDoc, Pt } from '../shared/types';
import { KIND_PRESETS } from '../src/core/feature';

let seq = 0;
const nid = (p: string) => `${p}_seed_${++seq}`;

const rectRing = (x: number, y: number, w: number, h: number): Pt[] => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

function feature(kind: FeatureKind, name: string, extra: Partial<Feature>): Feature {
  const preset = KIND_PRESETS[kind];
  return {
    id: nid(kind),
    kind,
    name,
    geom: preset.geom,
    paths: [],
    rings: [],
    visible: true,
    locked: false,
    ...structuredClone(preset.style),
    ...extra,
  };
}

/**
 * A plausible 36m × 24m machining workshop:
 *  - main logistics channel down the middle with a T-branch
 *  - pedestrian walkway along the north wall
 *  - fire lane across the south, with a yellow/black no-parking grid
 *  - 6 station frames in two rows
 *  - material staging and two hazard zones around press lines
 */
export function sampleWorkshopDoc(): PlanDoc {
  seq = 0;
  const W = 36000;
  const H = 24000;
  const features: Feature[] = [];

  features.push(
    feature('main-channel', '主通道 A', {
      paths: [
        [
          { x: 2000, y: 12000 },
          { x: 16000, y: 12000 },
          { x: 16000, y: 4000 },
          { x: 34000, y: 4000 },
        ],
      ],
      lineWidth: 100,
    })
  );
  features.push(
    feature('main-channel', '主通道 B', {
      paths: [
        [
          { x: 16000, y: 12000 },
          { x: 16000, y: 20000 },
        ],
      ],
      lineWidth: 100,
    })
  );
  features.push(
    feature('walkway', '北侧人行通道', {
      paths: [
        [
          { x: 1200, y: 1800 },
          { x: 34000, y: 1800 },
        ],
      ],
      lineWidth: 100,
    })
  );
  features.push(
    feature('fire-lane', '南侧消防通道', {
      paths: [
        [
          { x: 1200, y: 22200 },
          { x: 34000, y: 22200 },
        ],
      ],
      lineWidth: 120,
    })
  );

  // 禁停区: cross-hatch no-parking island between aisles
  features.push(
    feature('no-park', '通道口禁停区', {
      geom: 'area',
      rings: [rectRing(19000, 9000, 4000, 2400)],
      hatch: {
        type: 'diagonal',
        spacing: 300,
        angle: 45,
        lineWidth: 60,
        color: '#f2c200',
        color2: '#1a1a1a',
        alpha: 1,
      },
    })
  );

  // 工位框: two rows of three
  const stationNames = ['CNC-01', 'CNC-02', 'CNC-03', 'PRESS-01', 'PRESS-02', 'WELD-01'];
  stationNames.forEach((name, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    features.push(
      feature('station', `工位 ${name}`, {
        geom: 'area',
        rings: [rectRing(3000 + col * 4800, 5200 + row * 7000, 3200, 2600)],
        lineWidth: 50,
        outlineWidth: 50,
        strokeStyle: 'dashed',
      })
    );
  });

  features.push(
    feature('material', '物料暂存区 M-1', {
      geom: 'area',
      rings: [rectRing(24000, 14000, 6000, 5000)],
    })
  );
  features.push(
    feature('hazard', '冲压机械手危险区', {
      geom: 'area',
      rings: [rectRing(20000, 5400, 3200, 3200)],
    })
  );
  features.push(
    feature('hazard', '焊接烟尘隔离区', {
      geom: 'area',
      rings: [rectRing(30200, 15400, 3600, 4200)],
      hatch: {
        type: 'diagonal',
        spacing: 200,
        angle: -45,
        lineWidth: 50,
        color: '#d43f3f',
        color2: '#ffffff',
        alpha: 0.9,
      },
    })
  );

  return {
    schema: 1,
    name: '机加工车间 · 标线总图',
    workshopId: null,
    width: W,
    height: H,
    background: null,
    features,
    settings: {
      grid: { minor: 500, major: 2000, show: true, snapGrid: true, snapEndpoints: true, snapMidpoints: true, snapSegments: true },
      showDimensions: true,
    },
  };
}

/** A reference answer for training: adds a pedestrian crossing + missing fire-lane edge. */
export function sampleReferenceDoc(): PlanDoc {
  const doc = sampleWorkshopDoc();
  doc.name = '机加工车间 · 考核参考答案';
  doc.features.push(
    feature('walkway', '南侧人行连廊', {
      paths: [
        [
          { x: 6000, y: 19800 },
          { x: 6000, y: 14200 },
        ],
      ],
      lineWidth: 100,
    })
  );
  doc.features.push(
    feature('walkway', '横向人行道', {
      paths: [
        [
          { x: 6000, y: 19800 },
          { x: 26000, y: 19800 },
        ],
      ],
      lineWidth: 100,
    })
  );
  return doc;
}

/** Strip the reference features back to just the blank floor for a practice task. */
export function sampleBaseDoc(): PlanDoc {
  const doc = sampleWorkshopDoc();
  doc.name = '机加工车间 · 空白底图';
  doc.features = doc.features.filter((f) => f.kind === 'station').slice(0, 0);
  doc.features = [];
  return doc;
}

/**
 * A compact reference drawing used by unit tests: one of each kind, deterministic
 * ids, no randomness.
 */
export function sampleBenchDoc(): PlanDoc {
  seq = 1000;
  const features: Feature[] = [
    feature('main-channel', '主通道', {
      id: 'bench-channel',
      geom: 'path',
      paths: [[{ x: 1000, y: 5000 }, { x: 9000, y: 5000 }]],
      lineWidth: 100,
    }),
    feature('walkway', '人行道', {
      id: 'bench-walkway',
      geom: 'path',
      paths: [[{ x: 1000, y: 2000 }, { x: 9000, y: 2000 }]],
      lineWidth: 100,
    }),
    feature('fire-lane', '消防通道', {
      id: 'bench-fire',
      geom: 'path',
      paths: [[{ x: 1000, y: 8000 }, { x: 9000, y: 8000 }]],
      lineWidth: 120,
    }),
    feature('no-park', '禁停区', {
      id: 'bench-nopark',
      geom: 'area',
      rings: [rectRing(2000, 6000, 2000, 1200)],
    }),
    feature('station', '工位', {
      id: 'bench-station',
      geom: 'area',
      rings: [rectRing(5000, 6000, 2000, 1500)],
      lineWidth: 50,
      outlineWidth: 50,
    }),
    feature('hazard', '危险区', {
      id: 'bench-hazard',
      geom: 'area',
      rings: [rectRing(2000, 3000, 1000, 1000)],
    }),
  ];
  return {
    schema: 1,
    name: '单元测试参考图',
    workshopId: null,
    width: 12000,
    height: 10000,
    background: null,
    features,
    settings: {
      grid: { minor: 500, major: 2000, show: true, snapGrid: true, snapEndpoints: true, snapMidpoints: true, snapSegments: true },
      showDimensions: true,
    },
  };
}

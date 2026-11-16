import JSZip from 'jszip';
import type { Feature, ProjectMeta } from '../types';
import { FEATURE_TYPES } from '../config';

/** 要素转 GeoJSON 点/线/面，便于交付后在其他 GIS 中打开 */
function featureToGeoJSON(f: Feature): Record<string, unknown> {
  const base = {
    type: 'Feature',
    properties: {
      id: f.id,
      type: f.type,
      typeName: FEATURE_TYPES[f.type].label,
      layer: f.layer,
      deployDate: f.deployDate,
      radius: f.radius,
      depth: f.depth,
      heading: f.heading
    }
  };
  if (f.type === 'chain' && f.extra) {
    return {
      ...base,
      geometry: {
        type: 'LineString',
        coordinates: [
          [f.x, f.z, f.y],
          [f.x + (f.extra.ex ?? 0), f.z + (f.extra.ez ?? 0), f.y - f.depth]
        ]
      }
    };
  }
  if (f.type === 'warningZone') {
    const ring: number[][] = [];
    for (let k = 0; k <= 48; k++) {
      const ang = (k / 48) * Math.PI * 2;
      ring.push([f.x + Math.cos(ang) * f.radius, f.z + Math.sin(ang) * f.radius]);
    }
    return { ...base, geometry: { type: 'Polygon', coordinates: [ring] } };
  }
  if (f.type === 'channel' && f.extra) {
    const hx = f.extra.sx ?? f.radius;
    const hz = f.extra.sz ?? f.radius;
    const ring = [
      [f.x - hx, f.z - hz],
      [f.x + hx, f.z - hz],
      [f.x + hx, f.z + hz],
      [f.x - hx, f.z + hz],
      [f.x - hx, f.z - hz]
    ];
    return { ...base, geometry: { type: 'Polygon', coordinates: [ring] } };
  }
  return {
    ...base,
    geometry: { type: 'Point', coordinates: [f.x, f.z, f.y] }
  };
}

function countByType(features: Feature[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of features) out[f.type] = (out[f.type] ?? 0) + 1;
  return out;
}

/** 截止前打包交付：项目元数据 + GeoJSON 全量要素 + 返工记录 + 校验清单 */
export async function buildDeliveryPackage(meta: ProjectMeta, features: Feature[]): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder(`${meta.id}_${meta.zone}`)!;

  root.file('project.json', JSON.stringify(meta, null, 2));

  const geo = {
    type: 'FeatureCollection',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:local:meters' } },
    features: features.map(featureToGeoJSON)
  };
  root.file('features.geojson', JSON.stringify(geo));

  root.file(
    'reworks.json',
    JSON.stringify(
      meta.reworks.map((r) => ({
        id: r.id,
        reason: r.reason,
        at: new Date(r.at).toISOString(),
        circle: r.circle
      })),
      null,
      2
    )
  );

  const manifest = {
    package: '深远海养殖平台三维总图交付包',
    projectId: meta.id,
    zone: meta.zone,
    exportedAt: new Date().toISOString(),
    deadline: new Date(meta.deadline).toISOString(),
    beforeDeadline: Date.now() <= meta.deadline,
    status: meta.status,
    totalFeatures: features.length,
    countsByType: countByType(features),
    layerOverrides: Object.keys(meta.layerOverrides).length,
    reworkCount: meta.reworks.length,
    files: ['project.json', 'features.geojson', 'reworks.json', 'manifest.json']
  };
  root.file('manifest.json', JSON.stringify(manifest, null, 2));

  const readme = [
    '# 交付说明',
    '',
    `项目编号：${meta.id}`,
    `养殖区：${meta.zone}`,
    `要素总数：${features.length}`,
    `返工次数：${meta.reworks.length} / 3`,
    `导出时间：${manifest.exportedAt}`,
    '',
    '## 文件',
    '- project.json 项目元数据与图层归属覆盖',
    '- features.geojson 全量要素（局部米制坐标，[x,z,y]）',
    '- reworks.json 主管退回记录（圈位与原因）',
    '- manifest.json 交付校验清单',
    '',
    '## 返工记录',
    ...meta.reworks.flatMap((r, i) => [
      `${i + 1}. [${r.id}] ${new Date(r.at).toLocaleString()}`,
      `   圈位中心=(${r.circle.x.toFixed(1)}, ${r.circle.z.toFixed(1)}) 半径=${r.circle.radius}m`,
      `   原因：${r.reason}`
    ])
  ].join('\n');
  root.file('README.md', readme);

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

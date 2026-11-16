// Node 环境下给 store 提供 localStorage 桩
const mem = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k)
};

import { projectStore } from '../src/lib/data/store';
import { buildDeliveryPackage } from '../src/lib/data/exporter';
import { MAX_REWORK } from '../src/lib/config';
import JSZip from 'jszip';

let passed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name} ${detail}`);
  passed++;
  console.log(`  ✓ ${name}`);
}

// ---------------- 立项
const meta = projectStore.create('流程测试养殖区', 14);
check('新项目状态为制作中', meta.status === 'editing');
check('返工次数初始为 0', meta.reworks.length === 0);
check('图层覆盖初始为空', Object.keys(meta.layerOverrides).length === 0);

const features = projectStore.loadFeatures(meta);
check('项目要素上万', features.length > 10000, `实际 ${features.length}`);
check('再次读取走缓存且数量一致', projectStore.loadFeatures(meta).length === features.length);

// ---------------- 提交
const submitted = projectStore.submit(meta.id)!;
check('提交后状态为待审核', submitted.status === 'submitted');
check('记录了提交时间', !!submitted.submittedAt);
check('制作中以外状态重复提交不改变状态',
  projectStore.submit(meta.id)?.status === 'submitted'
);

// ---------------- 退回返工循环（最多 3 次）
const circle = { x: 100, y: 0, z: 200, radius: 120 };
let current = submitted;
for (let n = 1; n <= MAX_REWORK; n++) {
  current = projectStore.returnForRework(current.id, {
    reason: `第${n}次返工原因`,
    circle
  })!;
  check(`第 ${n} 次退回后状态为 returned`, current.status === 'returned');
  check(`返工记录累计 ${n} 条`, current.reworks.length === n);
  check(`第 ${n} 条记录带圈位与原因`,
    current.reworks[n - 1].circle.radius === 120 &&
    current.reworks[n - 1].reason === `第${n}次返工原因`
  );
  check(`剩余返工次数 = ${MAX_REWORK - n}`,
    projectStore.remainingReworks(current) === MAX_REWORK - n
  );
  if (n < MAX_REWORK) {
    // 制作员修改后重新提交，主管才能再次退回
    current = projectStore.submit(current.id)!;
    check('重新提交后回到待审核', current.status === 'submitted');
  }
}
check('达到 3 次上限后再退回被拒绝',
  projectStore.returnForRework(current.id, { reason: '不应生效', circle })?.reworks.length === MAX_REWORK
);
check('返工上限后不能再提交', projectStore.submit(current.id)?.status === 'returned');

// ---------------- 另起一个项目走通过→交付链路
const m2 = projectStore.create('交付测试养殖区', 14);
const f2 = projectStore.loadFeatures(m2);
projectStore.submit(m2.id);
check('非待审核状态不能通过', projectStore.approve(m2.id) !== undefined);
const approved = projectStore.approve(m2.id)!;
check('主管通过后状态为 approved', approved.status === 'approved');
check('已通过项目不能重复通过', projectStore.approve(m2.id)?.status === 'approved');

// ---------------- 框选批量改图层归属
const sample = f2.slice(0, 50).map((f) => f.id);
const beforeLayer = f2.find((f) => f.id === sample[0])!.layer;
projectStore.setLayerOverride(m2.id, sample, 'warning');
const after = projectStore.loadFeatures(m2);
check('批量改归属后要素图层已变更',
  after.find((f) => f.id === sample[0])!.layer === 'warning'
);
check('未选中的要素图层保持不变',
  after.find((f) => f.id === f2[f2.length - 1].id)!.layer === f2[f2.length - 1].layer
);
const m2updated = projectStore.get(m2.id)!;
check('图层覆盖已持久化到项目元数据',
  Object.keys(m2updated.layerOverrides).length === 50
);
check('变更前后确实发生了切换', beforeLayer !== 'warning');

// ---------------- 打包交付（用包含图层覆盖的最新项目状态）
const latestMeta = projectStore.get(m2.id)!;
const blob = await buildDeliveryPackage(latestMeta, after);
check('交付包为 ZIP Blob', blob instanceof Blob && blob.size > 1000, `size=${blob.size}`);
const zip = await JSZip.loadAsync(blob);
const names = Object.keys(zip.files);
for (const required of ['project.json', 'features.geojson', 'reworks.json', 'manifest.json', 'README.md']) {
  check(`交付包包含 ${required}`, names.some((n) => n.endsWith(required)));
}
const manifest = JSON.parse((await zip.file(names.find((n) => n.endsWith('manifest.json'))!)!.async('string')));
check('清单记录的要素总数正确', manifest.totalFeatures === after.length);
check('清单记录图层覆盖数为 50', manifest.layerOverrides === 50);
check('清单标记截止前交付', manifest.beforeDeadline === true);
const geo = JSON.parse((await zip.file(names.find((n) => n.endsWith('features.geojson'))!)!.async('string')));
check('GeoJSON 要素数与项目一致', geo.features.length === after.length);
check('GeoJSON 含点/线/面多种几何',
  new Set(geo.features.map((g: { geometry: { type: string } }) => g.geometry.type)).size >= 3
);

const delivered = projectStore.markDelivered(m2.id)!;
check('打包后项目标记为已交付', delivered.status === 'delivered');
check('已交付项目不能再次标记', projectStore.markDelivered(m2.id)?.status === 'delivered');

// ---------------- 项目列表与删除
const list = projectStore.list();
check('列表包含两个项目', list.length === 2);
projectStore.remove(m2.id);
check('删除后只剩一个项目', projectStore.list().length === 1);
check('删除的项目不可再取', projectStore.get(m2.id) === undefined);

console.log(`\n业务流程测试全部通过：${passed} 项`);

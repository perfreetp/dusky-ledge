import { defineComponent, h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api';
import type { PlanRecord, VersionRecord } from '@shared/types';
import { formatDate, downloadText, cloneJson } from '@/util/download';
import { exportSvg } from '@/core/svg';
import { store } from '@/state/editor';

export default defineComponent({
  name: 'VersionsView',
  setup() {
    const router = useRouter();
    const plans = ref<PlanRecord[]>([]);
    const selectedPlan = ref<string | null>(null);
    const versions = ref<VersionRecord[]>([]);
    const compare = ref<string[]>([]);
    const loading = ref(false);

    const load = async () => {
      plans.value = await api.plans();
      if (!selectedPlan.value && plans.value.length) selectedPlan.value = plans.value[0].id;
      if (selectedPlan.value) await loadVersions(selectedPlan.value);
    };

    const loadVersions = async (planId: string) => {
      loading.value = true;
      versions.value = await api.versions(planId);
      loading.value = false;
    };

    onMounted(load);

    const pick = async (id: string) => {
      selectedPlan.value = id;
      compare.value = [];
      await loadVersions(id);
    };

    const diff = () => {
      if (compare.value.length !== 2) return null;
      const a = versions.value.find((v) => v.id === compare.value[0])!;
      const b = versions.value.find((v) => v.id === compare.value[1])!;
      const byId = (v: VersionRecord) => new Map(v.doc.features.map((f) => [f.id, f]));
      const mapA = byId(a);
      const mapB = byId(b);
      const added = b.doc.features.filter((f) => !mapA.has(f.id));
      const removed = a.doc.features.filter((f) => !mapB.has(f.id));
      const changed: { name: string; fields: string[] }[] = [];
      for (const fb of b.doc.features) {
        const fa = mapA.get(fb.id);
        if (!fa) continue;
        const fields: string[] = [];
        if (fa.lineWidth !== fb.lineWidth) fields.push(`线宽 ${fa.lineWidth}→${fb.lineWidth}`);
        if (fa.strokeColor !== fb.strokeColor) fields.push('颜色');
        if (fa.name !== fb.name) fields.push('名称');
        if (JSON.stringify(fa.rings) !== JSON.stringify(fb.rings)) fields.push('轮廓');
        if (JSON.stringify(fa.paths) !== JSON.stringify(fb.paths)) fields.push('中心线');
        if (JSON.stringify(fa.hatch) !== JSON.stringify(fb.hatch)) fields.push('填充');
        if (fields.length) changed.push({ name: fb.name, fields });
      }
      return { a, b, added, removed, changed };
    };

    const restore = (v: VersionRecord) => {
      if (!confirm(`把版本「${v.name}」载入编辑器？当前未保存的修改会被覆盖（可在编辑器中撤销）。`)) return;
      try {
        localStorage.setItem('marking.pendingDoc', JSON.stringify(v.doc));
        localStorage.setItem('marking.pendingPlan', v.planId);
      } catch {
        /* ignore quota */
      }
      store.setDoc(cloneJson(v.doc), { resetHistory: true });
      store.planId.value = v.planId;
      router.push(`/editor/${v.planId}`);
    };

    const exportVersion = (v: VersionRecord) => {
      downloadText(`${v.doc.name}-${v.name}.svg`, exportSvg(v.doc, { includeDimensions: true }), 'image/svg+xml');
    };

    const toggleCompare = (id: string) => {
      if (compare.value.includes(id)) compare.value = compare.value.filter((x) => x !== id);
      else compare.value = [...compare.value.slice(-1), id];
    };

    return () =>
      h('div', { class: 'page' }, [
        h('div', { class: 'page-inner' }, [
          h('h1', null, '版本库'),
          h('div', { class: 'sub' }, '每次「保存并发布版本」都会形成不可变快照。可勾选两个版本对比差异，或导出任一版本给施工方。'),
          h('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap' }, [
            h('select', { value: selectedPlan.value ?? '', onChange: (e: Event) => pick((e.target as HTMLSelectElement).value), style: 'min-width:280px' },
              plans.value.map((p) => h('option', { value: p.id }, p.name))
            ),
            versions.value.length >= 2 ? h('span', { class: 'hint' }, `勾选两个版本进行对比（已选 ${compare.value.length}/2）`) : null,
          ]),
          loading.value
            ? h('div', { class: 'empty' }, '加载中…')
            : h('div', null, [
                h('table', { class: 'table' }, [
                  h('thead', null, [
                    h('tr', null, [
                      h('th', { style: 'width:36px', title: '勾选两个版本进行对比' }, '对比'),
                      h('th', null, '版本'),
                      h('th', null, '说明'),
                      h('th', null, '发布人'),
                      h('th', null, '发布时间'),
                      h('th', null, '对象数'),
                      h('th', null, '操作'),
                    ]),
                  ]),
                  h('tbody', null,
                    versions.value.map((v, i) =>
                      h('tr', { key: v.id }, [
                        h('td', null, [
                          h('input', {
                            type: 'checkbox',
                            checked: compare.value.includes(v.id),
                            onChange: () => toggleCompare(v.id),
                          }),
                        ]),
                        h('td', null, [
                          h('span', { class: 'mono', style: 'font-weight:600' }, v.name),
                          i === 0 ? h('span', { class: 'pill ok', style: 'margin-left:6px' }, '最新') : null,
                        ]),
                        h('td', null, v.note || '—'),
                        h('td', null, v.author || '—'),
                        h('td', { class: 'mono' }, formatDate(v.createdAt)),
                        h('td', { class: 'mono' }, String(v.doc.features.length)),
                        h('td', null, [
                          h('div', { style: 'display:flex;gap:5px' }, [
                            h('button', { class: 'ghost', onClick: () => restore(v) }, '恢复'),
                            h('button', { class: 'ghost', onClick: () => exportVersion(v) }, '导出 SVG'),
                          ]),
                        ]),
                      ])
                    )
                  ),
                ]),
                versions.value.length === 0 ? h('div', { class: 'empty' }, '该方案还没有版本快照。') : null,
                compare.value.length === 2 ? renderDiff() : null,
              ]),
        ]),
      ]);

    function renderDiff() {
      const d = diff();
      if (!d) return null;
      return h('div', { class: 'card', style: 'margin-top:16px' }, [
        h('h3', null, `版本对比：${d.a.name} → ${d.b.name}`),
        h('div', { class: 'grid3', style: 'margin-bottom:12px' }, [
          statCard('新增对象', d.added.length, '#22c55e'),
          statCard('删除对象', d.removed.length, '#ef4444'),
          statCard('修改对象', d.changed.length, '#f2c200'),
        ]),
        d.added.length
          ? h('div', { style: 'margin-bottom:10px' }, [
              h('div', { class: 'section-title' }, '新增'),
              h('div', { style: 'display:flex;gap:5px;flex-wrap:wrap' }, d.added.map((f) => h('span', { class: 'pill ok' }, `${f.name} (${f.kind})`))),
            ])
          : null,
        d.removed.length
          ? h('div', { style: 'margin-bottom:10px' }, [
              h('div', { class: 'section-title' }, '删除'),
              h('div', { style: 'display:flex;gap:5px;flex-wrap:wrap' }, d.removed.map((f) => h('span', { class: 'pill err' }, `${f.name} (${f.kind})`))),
            ])
          : null,
        d.changed.length
          ? h('div', null, [
              h('div', { class: 'section-title' }, '修改'),
              h('table', { class: 'table' }, [
                h('tbody', null, d.changed.map((c) => h('tr', null, [h('td', { style: 'width:190px' }, c.name), h('td', { class: 'hint' }, c.fields.join('、'))]))),
              ]),
            ])
          : null,
      ]);
    }
  },
});

function statCard(label: string, value: number, color: string) {
  return h('div', null, [
    h('div', { class: 'hint' }, label),
    h('div', { class: 'score small', style: `color:${color}` }, String(value)),
  ]);
}

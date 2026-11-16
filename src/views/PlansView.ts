import { defineComponent, h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '@/components/Icon';
import { api } from '@/api';
import type { PlanDoc, PlanRecord, Workshop } from '@shared/types';
import { sampleWorkshopDoc } from '@shared/samples';
import { formatDate, cloneJson } from '@/util/download';
import { store } from '@/state/editor';

export default defineComponent({
  name: 'PlansView',
  setup() {
    const router = useRouter();
    const plans = ref<PlanRecord[]>([]);
    const workshops = ref<Workshop[]>([]);
    const loading = ref(true);
    const filter = ref<string | 'all'>('all');
    const showNew = ref(false);
    const newName = ref('新建标线方案');
    const newWorkshop = ref<string | null>(null);
    const showWs = ref(false);
    const wsName = ref('');
    const wsCode = ref('');
    const error = ref('');

    const load = async () => {
      loading.value = true;
      error.value = '';
      try {
        const [p, w] = await Promise.all([api.plans(), api.workshops()]);
        plans.value = p;
        workshops.value = w;
        if (!newWorkshop.value && w.length) newWorkshop.value = w[0].id;
      } catch (e: any) {
        error.value = e.message ?? String(e);
      } finally {
        loading.value = false;
      }
    };

    onMounted(load);

    const create = async (seed: 'empty' | 'sample') => {
      try {
        const doc: PlanDoc = seed === 'sample' ? sampleWorkshopDoc() : {
          schema: 1 as const,
          name: newName.value,
          workshopId: newWorkshop.value,
          width: 24000,
          height: 16000,
          background: null,
          features: [],
          settings: {
            grid: { minor: 250, major: 1000, show: true, snapGrid: true, snapEndpoints: true, snapMidpoints: true, snapSegments: true },
            showDimensions: true,
          },
        };
        doc.name = newName.value || doc.name;
        doc.workshopId = newWorkshop.value;
        const plan = await api.savePlan({ name: doc.name, workshopId: newWorkshop.value, doc, createVersion: true, versionName: 'v1', versionNote: seed === 'sample' ? '示例车间初始版本' : '初始版本' });
        showNew.value = false;
        router.push(`/editor/${plan.id}`);
      } catch (e: any) {
        store.toast(`创建失败：${e.message}`, 'error');
      }
    };

    const remove = async (p: PlanRecord) => {
      if (!confirm(`确定删除方案「${p.name}」及其所有版本？此操作不可恢复。`)) return;
      await api.deletePlan(p.id);
      await load();
      store.toast('方案已删除');
    };

    const duplicate = async (p: PlanRecord) => {
      const copy = cloneJson(p.doc);
      copy.name = `${p.name} 副本`;
      const created = await api.savePlan({ name: copy.name, workshopId: p.workshopId, doc: copy, createVersion: true, versionName: 'v1' });
      router.push(`/editor/${created.id}`);
    };

    const createWorkshop = async () => {
      if (!wsName.value.trim()) return;
      await api.createWorkshop({ name: wsName.value.trim(), code: wsCode.value.trim() });
      wsName.value = '';
      wsCode.value = '';
      showWs.value = false;
      await load();
      store.toast('车间已创建', 'success');
    };

    const filtered = () => (filter.value === 'all' ? plans.value : plans.value.filter((p) => p.workshopId === filter.value));
    const wsNameOf = (id: string | null) => workshops.value.find((w) => w.id === id)?.name ?? '未分组';

    const statsOf = (p: PlanRecord) => {
      const doc = p.doc;
      let lines = 0;
      let areas = 0;
      let lengthM = 0;
      for (const f of doc.features) {
        if (f.geom === 'path') {
          lines++;
          for (const l of f.paths) for (let i = 0; i + 1 < l.length; i++) lengthM += Math.hypot(l[i + 1].x - l[i].x, l[i + 1].y - l[i].y) / 1000;
        } else areas++;
      }
      return { lines, areas, lengthM };
    };

    return () =>
      h('div', { class: 'page' }, [
        h('div', { class: 'page-inner' }, [
          h('div', { style: 'display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap' }, [
            h('div', null, [
              h('h1', null, '车间标线方案'),
              h('div', { class: 'sub' }, '按车间管理标线图纸，保存版本留档，导出 SVG 交付施工方。'),
            ]),
            h('div', { style: 'display:flex;gap:8px' }, [
              h('button', { onClick: () => (showWs.value = true) }, [h(Icon, { name: 'layers', size: 14 }), '新建车间']),
              h('button', { class: 'primary', onClick: () => (showNew.value = true) }, [h(Icon, { name: 'plus', size: 14 }), '新建方案']),
            ]),
          ]),
          error.value ? h('div', { class: 'card', style: 'border-color:rgba(239,68,68,.4);margin-bottom:14px' }, `接口错误：${error.value}。请确认后端已启动（npm run dev:server）。`) : null,
          h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin:18px 0 14px' }, [
            h('button', { class: filter.value === 'all' ? 'active' : '', onClick: () => (filter.value = 'all') }, `全部 (${plans.value.length})`),
            ...workshops.value.map((w) =>
              h('button', { key: w.id, class: filter.value === w.id ? 'active' : '', onClick: () => (filter.value = w.id) }, [
                w.name,
                h('span', { class: 'hint' }, `(${plans.value.filter((p) => p.workshopId === w.id).length})`),
              ])
            ),
          ]),
          loading.value
            ? h('div', { class: 'empty' }, '加载中…')
            : filtered().length === 0
              ? h('div', { class: 'card', style: 'text-align:center;padding:44px 20px' }, [
                  h('div', { style: 'font-size:15px;margin-bottom:6px' }, '这个车间还没有方案'),
                  h('div', { class: 'hint', style: 'margin-bottom:16px' }, '可以从空白图纸开始，或载入一份示例车间（含通道、禁停区、工位框、危险区）快速上手。'),
                  h('div', { style: 'display:flex;gap:8px;justify-content:center' }, [
                    h('button', { onClick: () => { newName.value = '车间标线总图'; showNew.value = true; } }, '新建空白方案'),
                    h('button', { class: 'primary', onClick: () => { newName.value = '机加工车间 · 标线总图'; showNew.value = true; } }, '载入示例车间'),
                  ]),
                ])
              : h(
                  'div',
                  { class: 'card-grid' },
                  filtered().map((p) => {
                    const s = statsOf(p);
                    return h(
                      'div',
                      { key: p.id, class: 'card', style: 'display:flex;flex-direction:column;gap:10px;cursor:pointer', onClick: () => router.push(`/editor/${p.id}`) },
                      [
                        h('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:10px' }, [
                          h('div', { style: 'font-weight:600;font-size:14px;line-height:1.35' }, p.name),
                          h('span', { class: 'tag', style: 'flex:0 0 auto' }, wsNameOf(p.workshopId)),
                        ]),
                        h('div', { class: 'hint mono' }, `${(p.doc.width / 1000).toFixed(0)}m × ${(p.doc.height / 1000).toFixed(0)}m · ${p.doc.features.length} 个对象`),
                        h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, [
                          h('span', { class: 'pill' }, `标线 ${s.lines}`),
                          h('span', { class: 'pill' }, `区域 ${s.areas}`),
                          h('span', { class: 'pill' }, `总长 ${s.lengthM.toFixed(0)} m`),
                          p.doc.features.some((f) => f.hatch) ? h('span', { class: 'pill warn' }, '含斜纹') : null,
                        ]),
                        h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:6px;border-top:1px solid var(--border-soft)' }, [
                          h('span', { class: 'hint mono' }, formatDate(p.updatedAt)),
                          h('div', { style: 'display:flex;gap:4px' }, [
                            h('button', { class: 'ghost icon', title: '复制方案', onClick: (e: MouseEvent) => { e.stopPropagation(); duplicate(p); } }, [h(Icon, { name: 'copy', size: 14 })]),
                            h('button', { class: 'ghost icon danger', title: '删除方案', onClick: (e: MouseEvent) => { e.stopPropagation(); remove(p); } }, [h(Icon, { name: 'trash', size: 14 })]),
                          ]),
                        ]),
                      ]
                    );
                  })
                ),
        ]),
        showNew.value
          ? h('div', { class: 'modal-backdrop', onClick: (e: MouseEvent) => e.target === e.currentTarget && (showNew.value = false) }, [
              h('div', { class: 'modal', style: 'width:min(460px,92vw)' }, [
                h('div', { class: 'modal-header' }, [h('span', null, '新建标线方案'), h('button', { class: 'ghost icon', onClick: () => (showNew.value = false) }, [h(Icon, { name: 'close', size: 15 })])]),
                h('div', { class: 'modal-body' }, [
                  h('div', { class: 'row' }, [h('label', null, '方案名'), h('input', { type: 'text', value: newName.value, onInput: (e: Event) => (newName.value = (e.target as HTMLInputElement).value) })]),
                  h('div', { class: 'row' }, [
                    h('label', null, '所属车间'),
                    h('select', { value: newWorkshop.value ?? '', onChange: (e: Event) => (newWorkshop.value = (e.target as HTMLSelectElement).value || null) }, [
                      h('option', { value: '' }, '未分组'),
                      ...workshops.value.map((w) => h('option', { value: w.id }, w.name)),
                    ]),
                  ]),
                  h('div', { class: 'hint' }, '创建时会自动生成 v1 版本。之后每次「保存并发布版本」都会新增快照，方便对比与追溯。'),
                ]),
                h('div', { class: 'modal-footer' }, [
                  h('button', { onClick: () => create('empty') }, '从空白开始'),
                  h('button', { class: 'primary', onClick: () => create('sample') }, '载入示例车间'),
                ]),
              ]),
            ])
          : null,
        showWs.value
          ? h('div', { class: 'modal-backdrop', onClick: (e: MouseEvent) => e.target === e.currentTarget && (showWs.value = false) }, [
              h('div', { class: 'modal', style: 'width:min(420px,92vw)' }, [
                h('div', { class: 'modal-header' }, [h('span', null, '新建车间'), h('button', { class: 'ghost icon', onClick: () => (showWs.value = false) }, [h(Icon, { name: 'close', size: 15 })])]),
                h('div', { class: 'modal-body' }, [
                  h('div', { class: 'row' }, [h('label', null, '车间名'), h('input', { type: 'text', value: wsName.value, placeholder: '如：一号机加车间', onInput: (e: Event) => (wsName.value = (e.target as HTMLInputElement).value) })]),
                  h('div', { class: 'row' }, [h('label', null, '编号'), h('input', { type: 'text', value: wsCode.value, placeholder: '如：WS-01', onInput: (e: Event) => (wsCode.value = (e.target as HTMLInputElement).value) })]),
                ]),
                h('div', { class: 'modal-footer' }, [h('button', { class: 'primary', onClick: createWorkshop }, '创建')]),
              ]),
            ])
          : null,
      ]);
  },
});

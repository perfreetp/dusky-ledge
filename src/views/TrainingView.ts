import { defineComponent, h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '@/components/Icon';
import { api } from '@/api';
import type { PlanDoc, TrainingRequirements, TrainingTask } from '@shared/types';
import { KIND_ORDER, KIND_PRESETS } from '@/core/feature';
import { formatDate, cloneJson } from '@/util/download';
import { sampleBaseDoc, sampleReferenceDoc } from '@shared/samples';
import { store } from '@/state/editor';

const DEFAULT_REQUIREMENTS: TrainingRequirements = {
  expected: {
    'main-channel': { width: 100, count: 2, required: true },
    walkway: { width: 100, count: 2, required: true },
    'fire-lane': { width: 120, count: 1, required: true },
    'no-park': { width: 100, count: 1, required: true },
    station: { width: 50, count: 6, required: true },
  },
  positionTolerance: 300,
  widthTolerance: 0.15,
  weights: { coverage: 0.5, width: 0.3, closure: 0.2 },
  notes: '按《车间地面安全标线规范》绘制：主通道 100mm 黄实线、人行道 100mm 绿实线、消防通道 120mm 红实线、禁停区黄黑斜纹、工位框 50mm 白虚线。',
};

export default defineComponent({
  name: 'TrainingView',
  setup() {
    const router = useRouter();
    const tasks = ref<TrainingTask[]>([]);
    const loading = ref(true);
    const showNew = ref(false);
    const mode = ref<'from-plan' | 'sample'>('sample');
    const plans = ref<{ id: string; name: string; doc: PlanDoc }[]>([]);
    const form = ref({
      title: '',
      description: '',
      planId: '',
      source: 'sample' as 'sample' | 'reference',
      requirements: structuredClone(DEFAULT_REQUIREMENTS),
    });

    const load = async () => {
      loading.value = true;
      tasks.value = await api.tasks('teacher');
      plans.value = (await api.plans()).map((p) => ({ id: p.id, name: p.name, doc: p.doc }));
      loading.value = false;
    };
    onMounted(load);

    const createSample = async () => {
      const base = sampleBaseDoc();
      const reference = sampleReferenceDoc();
      const task = await api.saveTask({
        title: form.value.title || '机加工车间标线练习',
        description: form.value.description || '使用统一规范图元，在一块空白厂房底图上完成通道、人行道、消防通道、禁停区与工位框的标线绘制。',
        baseDoc: base,
        referenceDoc: reference,
        requirements: form.value.requirements,
        createdBy: localStorage.getItem('marking.user') ?? '培训老师',
        published: false,
      });
      showNew.value = false;
      await load();
      router.push(`/training/${task.id}`);
    };

    const createFromPlan = async () => {
      const p = plans.value.find((x) => x.id === form.value.planId);
      if (!p) return store.toast('请选择一个方案作为参考答案', 'error');
      const base = cloneJson(p.doc);
      base.features = [];
      base.name = `${p.doc.name} · 空白底图`;
      const task = await api.saveTask({
        title: form.value.title || `${p.name} 标线练习`,
        description: form.value.description || '照着厂房底图与规范要求复现标线方案。',
        baseDoc: base,
        referenceDoc: cloneJson(p.doc),
        requirements: form.value.requirements,
        createdBy: localStorage.getItem('marking.user') ?? '培训老师',
        published: false,
      });
      showNew.value = false;
      await load();
      router.push(`/training/${task.id}`);
    };

    const togglePublish = async (t: TrainingTask) => {
      await api.publishTask(t.id, !t.published);
      await load();
      store.toast(t.published ? '已下架' : '已发布给学员', 'success');
    };

    const remove = async (t: TrainingTask) => {
      if (!confirm(`删除考核任务「${t.title}」及其全部学员提交？`)) return;
      await api.deleteTask(t.id);
      await load();
    };

    const reqRows = () =>
      h('div', null, [
        h('div', { class: 'hint', style: 'margin-bottom:6px' }, '为每类对象指定规范宽度与最低数量；评分时按覆盖度、线宽、闭合度加权。'),
        h('table', { class: 'table' }, [
          h('thead', null, [h('tr', null, [h('th', null, '类型'), h('th', null, '线宽 mm'), h('th', null, '数量'), h('th', null, '必做')])]),
          h('tbody', null, KIND_ORDER.map((kind) => {
            const cur = form.value.requirements.expected[kind];
            return h('tr', { key: kind }, [
              h('td', null, KIND_PRESETS[kind].label),
              h('td', null, h('input', {
                type: 'number', value: cur?.width ?? KIND_PRESETS[kind].style.lineWidth, style: 'width:80px',
                onInput: (e: Event) => {
                  const w = Number((e.target as HTMLInputElement).value);
                  form.value.requirements.expected[kind] = { width: w, count: cur?.count ?? 1, required: cur?.required ?? false };
                },
              })),
              h('td', null, h('input', {
                type: 'number', value: cur?.count ?? 0, style: 'width:70px',
                onInput: (e: Event) => {
                  const c = Number((e.target as HTMLInputElement).value);
                  form.value.requirements.expected[kind] = { width: cur?.width ?? 100, count: c, required: cur?.required ?? false };
                },
              })),
              h('td', null, h('input', {
                type: 'checkbox', checked: cur?.required ?? false,
                onChange: (e: Event) => {
                  const r = (e.target as HTMLInputElement).checked;
                  form.value.requirements.expected[kind] = { width: cur?.width ?? 100, count: cur?.count ?? 1, required: r };
                },
              })),
            ]);
          })),
        ]),
        h('div', { class: 'grid3', style: 'margin-top:10px' }, [
          h('div', { class: 'row' }, [h('label', null, '遮盖权重'), h('input', { type: 'number', step: 0.05, value: form.value.requirements.weights.coverage, onInput: (e: Event) => (form.value.requirements.weights.coverage = Number((e.target as HTMLInputElement).value)) })]),
          h('div', { class: 'row' }, [h('label', null, '线宽权重'), h('input', { type: 'number', step: 0.05, value: form.value.requirements.weights.width, onInput: (e: Event) => (form.value.requirements.weights.width = Number((e.target as HTMLInputElement).value)) })]),
          h('div', { class: 'row' }, [h('label', null, '闭合权重'), h('input', { type: 'number', step: 0.05, value: form.value.requirements.weights.closure, onInput: (e: Event) => (form.value.requirements.weights.closure = Number((e.target as HTMLInputElement).value)) })]),
          h('div', { class: 'row' }, [h('label', null, '位置容差'), h('input', { type: 'number', value: form.value.requirements.positionTolerance, onInput: (e: Event) => (form.value.requirements.positionTolerance = Number((e.target as HTMLInputElement).value)) })]),
          h('div', { class: 'row' }, [h('label', null, '线宽容差'), h('input', { type: 'number', step: 0.01, value: form.value.requirements.widthTolerance, onInput: (e: Event) => (form.value.requirements.widthTolerance = Number((e.target as HTMLInputElement).value)) })]),
        ]),
      ]);

    return () =>
      h('div', { class: 'page' }, [
        h('div', { class: 'page-inner' }, [
          h('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap' }, [
            h('div', null, [
              h('h1', null, '培训考核'),
              h('div', { class: 'sub' }, '老师出题：选定一块厂房底图，学员照着规范绘制；系统自动比对覆盖度与线宽给出初评，老师复核调分并汇总成绩。'),
            ]),
            h('button', { class: 'primary', onClick: () => (showNew.value = true) }, [h(Icon, { name: 'plus', size: 14 }), '新建考核任务']),
          ]),
          loading.value ? h('div', { class: 'empty' }, '加载中…') : null,
          tasks.value.length === 0 && !loading.value
            ? h('div', { class: 'card', style: 'text-align:center;padding:48px 20px' }, [
                h('div', { style: 'font-size:15px;margin-bottom:6px' }, '还没有考核任务'),
                h('div', { class: 'hint', style: 'margin-bottom:16px' }, '新建一个任务：系统内置一份「机加工车间」示例底图与参考答案，可直接用于首次培训。'),
                h('button', { class: 'primary', onClick: () => (showNew.value = true) }, '创建第一个任务'),
              ])
            : h('div', { class: 'card-grid', style: 'margin-top:18px' },
                tasks.value.map((t) =>
                  h('div', { key: t.id, class: 'card task-card' }, [
                    h('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:10px' }, [
                      h('div', { style: 'font-weight:600;font-size:14px;line-height:1.4;min-width:0' }, t.title),
                      h('span', { class: t.published ? 'pill ok' : 'pill', style: 'flex:0 0 auto' }, t.published ? '已发布' : '草稿'),
                    ]),
                    h('div', { class: 'hint', style: 'line-height:1.6;min-height:38px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden' }, t.description || '—'),
                    h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, [
                      h('span', { class: 'pill' }, `底图 ${(t.baseDoc.width / 1000).toFixed(0)}×${(t.baseDoc.height / 1000).toFixed(0)}m`),
                      h('span', { class: 'pill' }, t.referenceDoc ? `参考答案 ${t.referenceDoc.features.length} 项` : '无参考答案'),
                      h('span', { class: 'pill' }, `容差 ${t.requirements.positionTolerance}mm`),
                    ]),
                    h('div', { class: 'task-card-foot' }, [
                      h('span', { class: 'hint mono' }, formatDate(t.createdAt)),
                      h('div', { style: 'display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end' }, [
                        h('button', { class: 'ghost', onClick: () => router.push(`/practice/${t.id}?teacher=1`) }, '试做'),
                        h('button', { class: 'ghost', onClick: () => router.push(`/summary/${t.id}`) }, [h(Icon, { name: 'chart', size: 13 }), '成绩']),
                        h('button', { class: 'ghost', onClick: () => togglePublish(t) }, t.published ? '下架' : '发布'),
                        h('button', { class: 'ghost icon', title: '任务设置', onClick: () => router.push(`/training/${t.id}`) }, [h(Icon, { name: 'settings', size: 13 })]),
                        h('button', { class: 'ghost danger icon', title: '删除任务', onClick: () => remove(t) }, [h(Icon, { name: 'trash', size: 13 })]),
                      ]),
                    ]),
                  ])
                )
              ),
        ]),
        showNew.value
          ? h('div', { class: 'modal-backdrop', onClick: (e: MouseEvent) => e.target === e.currentTarget && (showNew.value = false) }, [
              h('div', { class: 'modal wide' }, [
                h('div', { class: 'modal-header' }, [h('span', null, '新建考核任务'), h('button', { class: 'ghost icon', onClick: () => (showNew.value = false) }, [h(Icon, { name: 'close', size: 15 })])]),
                h('div', { class: 'modal-body' }, [
                  h('div', { class: 'grid2' }, [
                    h('div', { class: 'row' }, [h('label', null, '标题'), h('input', { type: 'text', value: form.value.title, placeholder: '如：新员工标线实操考核（第一期）', onInput: (e: Event) => (form.value.title = (e.target as HTMLInputElement).value) })]),
                    h('div', { class: 'row' }, [
                      h('label', null, '底图来源'),
                      h('select', { onChange: (e: Event) => (mode.value = (e.target as HTMLSelectElement).value as 'from-plan' | 'sample') }, [
                        h('option', { value: 'sample', selected: mode.value === 'sample' }, '内置示例车间 + 参考答案'),
                        h('option', { value: 'from-plan', selected: mode.value === 'from-plan' }, '已有标线方案作为参考答案'),
                      ]),
                    ]),
                  ]),
                  h('div', { class: 'row' }, [h('label', null, '说明'), h('textarea', { rows: 2, value: form.value.description, style: 'flex:1;resize:vertical', onInput: (e: Event) => (form.value.description = (e.target as HTMLTextAreaElement).value) })]),
                  mode.value === 'from-plan'
                    ? h('div', { class: 'row' }, [
                        h('label', null, '参考方案'),
                        h('select', { value: form.value.planId, onChange: (e: Event) => (form.value.planId = (e.target as HTMLSelectElement).value) }, [
                          h('option', { value: '' }, '请选择…'),
                          ...plans.value.map((p) => h('option', { value: p.id }, p.name)),
                        ]),
                      ])
                    : h('div', { class: 'hint', style: 'margin-bottom:10px' }, '示例底图已清空所有标线；参考答案包含主通道、人行道、消防通道、禁停区、工位框与危险区。'),
                  h('div', { class: 'section-title', style: 'margin-top:14px' }, [h('span', null, '评分要求')]),
                  reqRows(),
                ]),
                h('div', { class: 'modal-footer' }, [
                  h('button', { onClick: () => (showNew.value = false) }, '取消'),
                  h('button', { class: 'primary', onClick: mode.value === 'from-plan' ? createFromPlan : createSample }, '创建任务'),
                ]),
              ]),
            ])
          : null,
      ]);
  },
});

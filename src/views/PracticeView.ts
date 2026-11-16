import { cloneJson } from '@/util/download';
import { defineComponent, h, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '@/components/Icon';
import PlanCanvas from '@/components/PlanCanvas';
import { api } from '@/api';
import type { Submission, TrainingTask } from '@shared/types';
import { KIND_ORDER, KIND_PRESETS } from '@/core/feature';
import { store } from '@/state/editor';

export default defineComponent({
  name: 'PracticeView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const task = ref<TrainingTask | null>(null);
    const studentName = ref(localStorage.getItem('marking.student') || '');
    const submission = ref<Submission | null>(null);
    const loading = ref(true);
    const submitting = ref(false);
    const started = ref(false);

    const storageKey = () => `marking.practice.${route.params.taskId}.${studentName.value || 'anon'}`;

    const load = async () => {
      loading.value = true;
      try {
        const t = await api.task(route.params.taskId as string);
        task.value = t;
      } catch (e: any) {
        store.toast(e.message, 'error');
      } finally {
        loading.value = false;
      }
    };
    onMounted(load);

    const begin = async () => {
      if (!studentName.value.trim()) {
        store.toast('请先填写姓名，用于成绩登记', 'error');
        return;
      }
      localStorage.setItem('marking.student', studentName.value.trim());
      const t = task.value!;
      // restore local draft if any
      let doc = cloneJson(t.baseDoc);
      try {
        const saved = localStorage.getItem(storageKey());
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.doc?.features) doc = parsed.doc;
        }
      } catch {
        /* ignore */
      }
      store.setDoc(doc, { resetHistory: true });
      store.viewMode.value = 'edit';
      started.value = true;
      setTimeout(() => store.fitToContent(), 60);
    };

    const persist = () => {
      if (!started.value) return;
      try {
        localStorage.setItem(storageKey(), JSON.stringify({ doc: store.doc.value, at: Date.now() }));
      } catch {
        /* quota */
      }
    };

    const submit = async (asDraft: boolean) => {
      if (!task.value) return;
      submitting.value = true;
      try {
        const res = await api.submit({
          id: submission.value?.id ?? null,
          taskId: task.value.id,
          studentName: studentName.value.trim(),
          doc: store.doc.value,
          submit: !asDraft,
        });
        submission.value = res;
        if (asDraft) {
          store.toast('已暂存到服务器', 'success');
        } else {
          store.toast(`已提交，自动评分 ${res.autoGrade?.score ?? 0} 分，等待老师复核`, 'success');
          localStorage.removeItem(storageKey());
          router.push(`/grade/${res.id}?student=1`);
        }
      } catch (e: any) {
        store.toast(`提交失败：${e.message}`, 'error');
      } finally {
        submitting.value = false;
      }
    };

    const requirementPanel = () =>
      task.value
        ? h('aside', { class: 'inspector' }, [
            h('div', { class: 'sidebar-header' }, [h('span', null, '考核要求'), h('span', { class: 'pill warn' }, '评分依据')]),
            h('div', { class: 'sidebar-body' }, [
              h('div', { class: 'section' }, [
                h('div', { class: 'hint', style: 'line-height:1.7' }, task.value.requirements.notes || task.value.description),
              ]),
              h('div', { class: 'section' }, [
                h('div', { class: 'section-title' }, [h('span', null, '对象与线宽')]),
                h('div', { style: 'display:flex;flex-direction:column;gap:5px' }, KIND_ORDER.filter((k) => task.value!.requirements.expected[k]).map((kind) => {
                  const r = task.value!.requirements.expected[kind]!;
                  return h('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:8px' }, [
                    h('span', { style: 'display:flex;align-items:center;gap:6px;font-size:12px' }, [
                      h('span', { style: `width:9px;height:9px;border-radius:2px;background:${KIND_PRESETS[kind].color}` }),
                      KIND_PRESETS[kind].label,
                    ]),
                    h('span', { class: 'hint mono' }, `${r.width}mm × ${r.count}${r.required ? ' · 必做' : ''}`),
                  ]);
                })),
              ]),
              h('div', { class: 'section' }, [
                h('div', { class: 'section-title' }, [h('span', null, '评分方式')]),
                h('div', { class: 'hint', style: 'line-height:1.7' }, [
                  h('div', null, `覆盖度 ${(task.value.requirements.weights.coverage * 100).toFixed(0)}% · 线宽 ${(task.value.requirements.weights.width * 100).toFixed(0)}% · 闭合 ${(task.value.requirements.weights.closure * 100).toFixed(0)}%`),
                  h('div', null, `位置容差 ±${task.value.requirements.positionTolerance}mm，线宽容差 ±${(task.value.requirements.widthTolerance * 100).toFixed(0)}%`),
                  h('div', { style: 'margin-top:6px;color:var(--text-faint)' }, '系统先给出自动分数，老师会在成绩页复核并调整。'),
                ]),
              ]),
              h('div', { class: 'section' }, [
                h('div', { class: 'section-title' }, [h('span', null, '操作')]),
                h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, [
                  h('button', { onClick: () => store.fitToContent() }, [h(Icon, { name: 'fit', size: 13 }), '适应窗口']),
                  h('button', { onClick: () => store.selectAll() }, '全选对象'),
                  h('button', { onClick: () => { persist(); store.toast('已保存到本机草稿', 'success'); } }, '暂存到本机'),
                  h('button', { onClick: () => {
                    if (confirm('清空画布重新开始？')) {
                      store.setDoc(cloneJson(task.value!.baseDoc), { resetHistory: true });
                      persist();
                    }
                  }, class: 'danger' }, '清空重画'),
                ]),
              ]),
            ]),
          ])
        : null;

    return () =>
      loading.value
        ? h('div', { class: 'empty' }, '加载中…')
        : !started.value
          ? h('div', { class: 'page' }, [
              h('div', { class: 'page-inner', style: 'max-width:640px' }, [
                h('h1', null, task.value?.title ?? '练习'),
                h('div', { class: 'sub' }, task.value?.description ?? ''),
                h('div', { class: 'card' }, [
                  h('div', { class: 'section-title' }, '开始前'),
                  h('div', { class: 'row' }, [
                    h('label', null, '姓名'),
                    h('input', { type: 'text', value: studentName.value, placeholder: '请输入真实姓名', onInput: (e: Event) => (studentName.value = (e.target as HTMLInputElement).value) }),
                  ]),
                  h('div', { class: 'hint', style: 'margin-bottom:14px;line-height:1.8' }, [
                    h('div', null, '1. 在空白厂房底图上，使用左侧「规范图元库」绘制标线。'),
                    h('div', null, '2. 通道、人行、消防为线对象；禁停区、工位框、物料区、危险区为面对象。'),
                    h('div', null, '3. 线宽、颜色尽量贴近规范；面对象必须闭合成轮廓。'),
                    h('div', null, '4. 提交后系统会自动比对覆盖度与线宽，老师会复核调分。'),
                  ]),
                  h('div', { style: 'display:flex;gap:8px' }, [
                    h('button', { class: 'primary', onClick: begin }, [h(Icon, { name: 'paint', size: 14 }), '开始绘制']),
                    h('button', { onClick: () => router.push('/training') }, '返回'),
                  ]),
                ]),
              ]),
            ])
          : h('div', { class: 'editor-view', style: 'height:100%;display:flex;flex-direction:column' }, [
              h('div', { class: 'editor-toolbar' }, [
                h('button', { class: 'ghost icon', onClick: () => router.push('/training') }, [h(Icon, { name: 'back', size: 16 })]),
                h('span', { style: 'font-weight:600' }, task.value?.title),
                h('span', { class: 'pill' }, `学员 ${studentName.value}`),
                h('div', { style: 'flex:1' }),
                h('button', { onClick: () => store.undo(), disabled: !store.history.canUndo }, [h(Icon, { name: 'undo', size: 14 })]),
                h('button', { onClick: () => store.redo(), disabled: !store.history.canRedo }, [h(Icon, { name: 'redo', size: 14 })]),
                h('button', { onClick: () => { persist(); } }, '暂存'),
                h('button', { class: 'primary', onClick: () => submit(false), disabled: submitting.value }, [h(Icon, { name: 'send', size: 14 }), submitting.value ? '提交中…' : '提交评分']),
              ]),
              h('div', { class: 'workspace', style: 'grid-template-columns:54px 200px 1fr 300px' }, [
                h('aside', { class: 'toolrail' }, [
                  ...[
                    { id: 'select', icon: 'select', label: '选择' },
                    { id: 'pan', icon: 'pan', label: '平移' },
                  ].map((t) => h('button', { class: ['tool', { active: store.tool.value === t.id }], title: t.label, onClick: () => (store.tool.value = t.id as any) }, [h(Icon, { name: t.icon, size: 18 })])),
                  h('div', { class: 'divider' }),
                  ...KIND_ORDER.map((kind) => {
                    const preset = KIND_PRESETS[kind];
                    const toolId = kind === 'main-channel' ? 'channel' : kind === 'walkway' ? 'walkway' : kind === 'fire-lane' ? 'firelane' : kind === 'no-park' ? 'park' : kind === 'station' ? 'station' : kind === 'material' ? 'material' : 'hazard';
                    return h('button', { class: ['tool', { active: store.tool.value === toolId }], title: `${preset.label}（${preset.geom === 'path' ? '逐点绘线' : '拖拽画面'}）`, onClick: () => (store.tool.value = toolId as any) }, [h(Icon, { name: preset.kind === 'fire-lane' ? 'fire' : preset.kind === 'main-channel' ? 'channel' : preset.kind === 'walkway' ? 'walkway' : preset.kind === 'no-park' ? 'park' : preset.kind === 'station' ? 'station' : preset.kind === 'material' ? 'material' : 'hazard', size: 18 })]);
                  }),
                ]),
                h('aside', { class: 'sidebar' }, [
                  h('div', { class: 'sidebar-header' }, [h('span', null, '图元')]),
                  h('div', { class: 'sidebar-body', style: 'padding:8px 10px' }, KIND_ORDER.map((kind) => {
                    const p = KIND_PRESETS[kind];
                    return h('button', { class: 'lib-item', style: 'width:100%;justify-content:flex-start;margin-bottom:5px;padding:7px 9px;background:var(--panel-2)', onClick: () => {
                      const toolId = kind === 'main-channel' ? 'channel' : kind === 'walkway' ? 'walkway' : kind === 'fire-lane' ? 'firelane' : kind === 'no-park' ? 'park' : kind === 'station' ? 'station' : kind === 'material' ? 'material' : 'hazard';
                      store.tool.value = toolId as any;
                    } }, [
                      h('span', { style: `width:10px;height:10px;border-radius:2px;flex:0 0 10px;background:${p.color}` }),
                      h('span', { style: 'flex:1;text-align:left' }, p.label),
                      h('span', { class: 'tag' }, `${p.style.lineWidth}mm`),
                    ]);
                  })),
                ]),
                h('div', { class: 'canvas-host' }, [h(PlanCanvas)]),
                requirementPanel(),
              ]),
              h('div', { class: 'toast-stack' }),
            ]);
  },
});

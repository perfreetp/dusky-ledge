import { defineComponent, h, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '@/components/Icon';
import { api } from '@/api';
import type { Submission, TrainingTask } from '@shared/types';
import { formatDate } from '@/util/download';
import { KIND_PRESETS } from '@/core/feature';
import { store } from '@/state/editor';

export default defineComponent({
  name: 'TaskDetailView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const task = ref<TrainingTask | null>(null);
    const submissions = ref<Submission[]>([]);
    const loading = ref(true);

    const load = async () => {
      const id = route.params.taskId as string;
      loading.value = true;
      task.value = await api.task(id, 'teacher');
      submissions.value = await api.submissions(id);
      loading.value = false;
    };
    onMounted(load);

    const publish = async () => {
      if (!task.value) return;
      await api.publishTask(task.value.id, !task.value.published);
      await load();
      store.toast(task.value?.published ? '已发布' : '已下架', 'success');
    };

    return () =>
      h('div', { class: 'page' }, [
        h('div', { class: 'page-inner' }, [
          h('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:4px' }, [
            h('button', { class: 'ghost icon', onClick: () => router.push('/training') }, [h(Icon, { name: 'back', size: 16 })]),
            h('h1', { style: 'margin:0' }, task.value?.title ?? '考核任务'),
            task.value ? h('span', { class: task.value.published ? 'pill ok' : 'pill' }, task.value.published ? '已发布' : '草稿') : null,
          ]),
          h('div', { class: 'sub' }, task.value?.description ?? ''),
          loading.value
            ? h('div', { class: 'empty' }, '加载中…')
            : task.value
              ? h('div', { style: 'display:grid;grid-template-columns:1.1fr 1fr;gap:16px;align-items:start' }, [
                  h('div', { class: 'card' }, [
                    h('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, [
                      h('h3', { style: 'margin:0' }, '学员提交'),
                      h('div', { style: 'display:flex;gap:6px' }, [
                        h('button', { onClick: publish }, task.value.published ? '下架' : '发布给学员'),
                        h('button', { class: 'primary', onClick: () => router.push(`/summary/${task.value!.id}`) }, [h(Icon, { name: 'chart', size: 14 }), '成绩汇总']),
                      ]),
                    ]),
                    h('div', { class: 'hint', style: 'margin:6px 0 12px' }, '学员入口：培训考核 → 打开任务 → 开始练习。提交后自动评分，等待老师复核。'),
                    submissions.value.length === 0
                      ? h('div', { class: 'empty' }, '还没有学员提交。把任务「发布」后，学员即可在练习页提交。')
                      : h('table', { class: 'table' }, [
                          h('thead', null, [h('tr', null, [h('th', null, '学员'), h('th', null, '状态'), h('th', null, '自动分'), h('th', null, '复核分'), h('th', null, '提交时间'), h('th')])]),
                          h('tbody', null, submissions.value.map((s) =>
                            h('tr', { key: s.id }, [
                              h('td', { style: 'font-weight:500' }, s.studentName),
                              h('td', null, h('span', { class: `status-badge ${s.status}` }, s.status === 'draft' ? '草稿' : s.status === 'submitted' ? '待复核' : '已复核')),
                              h('td', { class: 'mono' }, s.autoGrade ? String(s.autoGrade.score) : '—'),
                              h('td', { class: 'mono', style: 'font-weight:600' }, s.review?.finalScore != null ? String(s.review.finalScore) : '—'),
                              h('td', { class: 'mono hint' }, formatDate(s.submittedAt ?? s.updatedAt)),
                              h('td', null, h('button', { class: s.status === 'submitted' ? 'primary' : '', onClick: () => router.push(`/grade/${s.id}`) }, s.status === 'submitted' ? '复核' : '查看')),
                            ])
                          )),
                        ]),
                  ]),
                  h('div', { class: 'card' }, [
                    h('h3', null, '任务设置'),
                    h('div', { class: 'section' }, [
                      h('div', { class: 'row' }, [h('label', null, '底图'), h('span', { class: 'mono' }, `${(task.value.baseDoc.width / 1000).toFixed(0)} × ${(task.value.baseDoc.height / 1000).toFixed(0)} m`)]),
                      h('div', { class: 'row' }, [h('label', null, '参考答案'), h('span', { class: 'mono' }, `${task.value.referenceDoc?.features.length ?? 0} 个对象`)]),
                      h('div', { class: 'row' }, [h('label', null, '位置容差'), h('span', { class: 'mono' }, `${task.value.requirements.positionTolerance} mm`)]),
                      h('div', { class: 'row' }, [h('label', null, '线宽容差'), h('span', { class: 'mono' }, `±${(task.value.requirements.widthTolerance * 100).toFixed(0)}%`)]),
                    ]),
                    h('div', { class: 'section-title', style: 'margin-top:8px' }, '评分权重'),
                    h('div', { class: 'grid3' }, [
                      h('div', null, [h('div', { class: 'hint' }, '覆盖度'), h('div', { class: 'mono' }, `${(task.value.requirements.weights.coverage * 100).toFixed(0)}%`)]),
                      h('div', null, [h('div', { class: 'hint' }, '线宽'), h('div', { class: 'mono' }, `${(task.value.requirements.weights.width * 100).toFixed(0)}%`)]),
                      h('div', null, [h('div', { class: 'hint' }, '闭合'), h('div', { class: 'mono' }, `${(task.value.requirements.weights.closure * 100).toFixed(0)}%`)]),
                    ]),
                    h('div', { class: 'section-title', style: 'margin-top:10px' }, '要求清单'),
                    h('div', { style: 'display:flex;flex-direction:column;gap:4px' }, Object.entries(task.value.requirements.expected).map(([kind, r]) =>
                      h('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, [
                        h('span', { style: 'font-size:12px' }, KIND_PRESETS[kind as keyof typeof KIND_PRESETS]?.label ?? kind),
                        h('span', { class: 'hint mono' }, `${r?.width ?? '—'} mm · ${r?.count ?? 0} 个${r?.required ? ' · 必做' : ''}`),
                      ])
                    )),
                    h('div', { class: 'hint', style: 'margin-top:12px' }, task.value.requirements.notes),
                  ]),
                ])
              : null,
        ]),
      ]);
  },
});

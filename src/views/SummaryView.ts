import { defineComponent, h, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '@/components/Icon';
import { api } from '@/api';
import { store } from '@/state/editor';
import { formatDate, downloadText } from '@/util/download';

interface SummaryData {
  task: { id: string; title: string };
  counts: { total: number; submitted: number; reviewed: number; pass: number };
  stats: { avg: number; max: number; min: number; passRate: number };
  students: {
    id: string;
    studentName: string;
    status: string;
    autoScore: number | null;
    finalScore: number | null;
    submittedAt: string | null;
    wrongCount: number;
    topWrong: string[];
  }[];
  wrongList: { title: string; type: string; count: number }[];
}

export default defineComponent({
  name: 'SummaryView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const data = ref<SummaryData | null>(null);
    const loading = ref(true);

    const load = async () => {
      loading.value = true;
      data.value = await api.summary(route.params.taskId as string);
      loading.value = false;
    };
    onMounted(load);

    const exportCsv = () => {
      if (!data.value) return;
      const rows = ['学员,状态,自动分,复核分,错题数,提交时间'];
      for (const s of data.value.students) {
        rows.push([s.studentName, s.status === 'reviewed' ? '已复核' : s.status === 'submitted' ? '待复核' : '草稿', s.autoScore ?? '', s.finalScore ?? '', s.wrongCount, formatDate(s.submittedAt)].join(','));
      }
      downloadText(`${data.value.task.title}-成绩.csv`, '﻿' + rows.join('\n'), 'text/csv');
      store.toast('成绩已导出', 'success');
    };

    return () =>
      loading.value
        ? h('div', { class: 'empty' }, '加载中…')
        : !data.value
          ? h('div', { class: 'empty' }, '找不到该任务')
          : h('div', { class: 'page' }, [
              h('div', { class: 'page-inner' }, [
                h('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap' }, [
                  h('button', { class: 'ghost icon', onClick: () => router.push(`/training/${data.value!.task.id}`) }, [h(Icon, { name: 'back', size: 16 })]),
                  h('h1', { style: 'margin:0' }, `${data.value.task.title} · 成绩汇总`),
                ]),
                h('div', { style: 'display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:18px' }, [
                  stat('提交人数', `${data.value.counts.submitted}/${data.value.counts.total}`),
                  stat('平均分', String(data.value.stats.avg), '#38bdf8'),
                  stat('最高分', String(data.value.stats.max)),
                  stat('最低分', String(data.value.stats.min)),
                  stat('及格率', `${data.value.stats.passRate}%`, '#22c55e'),
                ]),
                h('div', { style: 'display:grid;grid-template-columns:1.4fr 1fr;gap:14px;align-items:start' }, [
                  h('div', { class: 'card' }, [
                    h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px' }, [
                      h('h3', { style: 'margin:0' }, '学员成绩'),
                      h('button', { onClick: exportCsv }, [h(Icon, { name: 'export', size: 13 }), '导出 CSV']),
                    ]),
                    data.value.students.length === 0
                      ? h('div', { class: 'empty' }, '还没有学员提交')
                      : h('table', { class: 'table' }, [
                          h('thead', null, [h('tr', null, [h('th', null, '学员'), h('th', null, '状态'), h('th', null, '自动'), h('th', null, '最终'), h('th', null, '错题'), h('th', null, '提交时间'), h('th')])]),
                          h('tbody', null, data.value.students.map((s) =>
                            h('tr', { key: s.id }, [
                              h('td', { style: 'font-weight:500' }, s.studentName),
                              h('td', null, h('span', { class: `status-badge ${s.status}` }, s.status === 'reviewed' ? '已复核' : s.status === 'submitted' ? '待复核' : '草稿')),
                              h('td', { class: 'mono' }, s.autoScore == null ? '—' : String(s.autoScore)),
                              h('td', { class: 'mono', style: 'font-weight:700' }, s.finalScore == null ? '—' : String(s.finalScore)),
                              h('td', { class: 'mono' }, String(s.wrongCount)),
                              h('td', { class: 'hint mono' }, formatDate(s.submittedAt)),
                              h('td', null, [h('button', { class: 'ghost', onClick: () => router.push(`/grade/${s.id}`) }, s.status === 'reviewed' ? '查看' : '复核')]),
                            ])
                          )),
                        ]),
                  ]),
                  h('div', { style: 'display:flex;flex-direction:column;gap:14px' }, [
                    h('div', { class: 'card' }, [
                      h('h3', null, '分数分布'),
                      h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, bucketize(data.value).map((b) =>
                        h('div', { key: b.label }, [
                          h('div', { style: 'display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim);margin-bottom:3px' }, [
                            h('span', null, b.label),
                            h('span', { class: 'mono' }, String(b.count)),
                          ]),
                          h('div', { class: 'progress' }, [h('i', { style: `width:${b.pct}%;background:${b.color}` })]),
                        ])
                      )),
                    ]),
                    h('div', { class: 'card' }, [
                      h('h3', null, '高频错题 Top 10'),
                      data.value.wrongList.length === 0
                        ? h('div', { class: 'hint' }, '暂无错题统计。')
                        : h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, data.value.wrongList.slice(0, 10).map((w, i) =>
                            h('div', { key: i, style: 'display:flex;gap:8px;align-items:flex-start' }, [
                              h('span', { class: 'mono', style: 'color:var(--text-faint);width:16px' }, String(i + 1)),
                              h('div', { style: 'flex:1;min-width:0' }, [
                                h('div', { style: 'font-size:12px;line-height:1.4' }, w.title),
                                h('div', { class: 'progress', style: 'margin-top:4px' }, [
                                  h('i', {
                                    style: `width:${(w.count / Math.max(1, data.value!.counts.submitted)) * 100}%;background:${w.type === 'missing' ? '#ef4444' : w.type === 'width' ? '#f2c200' : '#38bdf8'}`,
                                  }),
                                ]),
                              ]),
                              h('span', { class: 'pill err', style: 'flex:0 0 auto' }, `${w.count} 人`),
                            ])
                          )),
                    ]),
                  ]),
                ]),
              ]),
            ]);

    function stat(label: string, value: string, color = 'var(--text)') {
      return h('div', { class: 'card', style: 'padding:14px 16px' }, [
        h('div', { class: 'hint' }, label),
        h('div', { class: 'score small', style: `color:${color}` }, value),
      ]);
    }

    function bucketize(d: SummaryData) {
      const scores = d.students.map((s) => s.finalScore ?? s.autoScore).filter((v): v is number => v != null);
      const buckets = [
        { label: '90–100 优秀', min: 90, max: 101, color: '#22c55e' },
        { label: '80–89 良好', min: 80, max: 90, color: '#38bdf8' },
        { label: '60–79 及格', min: 60, max: 80, color: '#f2c200' },
        { label: '0–59 不及格', min: 0, max: 60, color: '#ef4444' },
      ];
      return buckets.map((b) => {
        const count = scores.filter((s) => s >= b.min && s < b.max).length;
        return { ...b, count, pct: scores.length ? (count / scores.length) * 100 : 0 };
      });
    }
  },
});

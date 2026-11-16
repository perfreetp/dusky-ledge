import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '@/components/Icon';
import { api } from '@/api';
import type { GradeItem, PlanDoc, Submission, TrainingTask, TeacherReview } from '@shared/types';
import { store } from '@/state/editor';


import { featureRings } from '@/core/feature';

import { boundsOfFeatures } from '@/core/feature';
import { generateHatchVariants } from '@/core/hatch';
import { formatDate } from '@/util/download';

export default defineComponent({
  name: 'GradeView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const submission = ref<Submission | null>(null);
    const task = ref<TrainingTask | null>(null);
    const loading = ref(true);
    // Student view is opt-in via `?student=1` AND remembered for this submission,
    // so a teacher opening the same link from the review queue always gets the
    // grading tools. Reviewing the same submission as a student sets the flag.
    const isStudent = ref(route.query.student === '1');
    const finalScore = ref<number | null>(null);
    const remark = ref('');
    const adjustments = ref<Record<string, { deduction: number; comment: string }>>({});
    const leftRef = ref<HTMLCanvasElement | null>(null);
    const rightRef = ref<HTMLCanvasElement | null>(null);
    const activeItem = ref<string | null>(null);
    const saving = ref(false);

    const load = async () => {
      loading.value = true;
      try {
        const s = await api.submission(route.params.submissionId as string);
        if (s.review) isStudent.value = isStudent.value && s.status === 'reviewed';
        submission.value = s;
        task.value = await api.task(s.taskId, isStudent.value ? undefined : 'teacher');
        finalScore.value = s.review?.finalScore ?? null;
        remark.value = s.review?.remark ?? '';
        adjustments.value = Object.fromEntries((s.review?.adjustedItems ?? []).map((a) => [a.id, { deduction: a.deduction, comment: a.comment }]));
      } catch (e: any) {
        store.toast(e.message, 'error');
      } finally {
        loading.value = false;
      }
    };
    onMounted(load);

    const effectiveItems = computed<GradeItem[]>(() => {
      if (!submission.value?.autoGrade) return [];
      return submission.value.autoGrade.items.map((it) => {
        const adj = adjustments.value[it.id];
        return adj ? { ...it, deduction: adj.deduction } : it;
      });
    });

    const autoTotal = computed(() => submission.value?.autoGrade?.score ?? 0);
    // The auto score is 100 minus the sum of item deductions, so the live preview
    // of a teacher's edits uses exactly the same arithmetic.
    const suggested = computed(() => {
      const base = submission.value?.autoGrade;
      if (!base) return 0;
      const total = effectiveItems.value.reduce((acc, it) => acc + Math.max(0, it.deduction), 0);
      return Math.round(Math.max(0, Math.min(100, 100 - total)) * 10) / 10;
    });

    const setDeduction = (id: string, v: number) => {
      const item = effectiveItems.value.find((x) => x.id === id);
      adjustments.value = { ...adjustments.value, [id]: { deduction: v, comment: adjustments.value[id]?.comment ?? '' } };
      void item;
      if (finalScore.value == null) finalScore.value = suggested.value;
    };

    const saveReview = async () => {
      if (!submission.value) return;
      saving.value = true;
      try {
        const review: Partial<TeacherReview> = {
          finalScore: finalScore.value ?? suggested.value,
          remark: remark.value,
          reviewer: localStorage.getItem('marking.user') ?? '培训老师',
          adjustedItems: Object.entries(adjustments.value).map(([id, v]) => ({ id, deduction: v.deduction, comment: v.comment })),
        };
        const updated = await api.review(submission.value.id, review);
        submission.value = updated;
        store.toast('复核已保存', 'success');
      } catch (e: any) {
        store.toast(`保存失败：${e.message}`, 'error');
      } finally {
        saving.value = false;
      }
    };

    // ---- canvases: draw reference + student side by side ------------------
    // Previews are static, so they are drawn once with the 2D painter rather than
    // spinning up a GPU device per render (which would leak on every page visit).
    let thumbRaf = 0;
    const renderThumbs = () => {
      cancelAnimationFrame(thumbRaf);
      thumbRaf = requestAnimationFrame(() => {
        const draw = (canvas: HTMLCanvasElement, doc: PlanDoc | null) => {
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          const dpr = Math.min(devicePixelRatio || 1, 2);
          const w = canvas.clientWidth || 400;
          const hgt = canvas.clientHeight || 300;
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(hgt * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, w, hgt);
          if (!doc) {
            ctx.fillStyle = 'rgba(148,163,184,.35)';
            ctx.font = '12px ui-sans-serif, system-ui';
            ctx.fillText('无数据', 12, 22);
            return;
          }
          // white sheet + light grid
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, w, hgt);
          const rect = boundsOfFeatures(doc.features);
          const pad = 400;
          const b = {
            minX: Math.min(rect.minX, 0) - pad,
            minY: Math.min(rect.minY, 0) - pad,
            maxX: Math.max(rect.maxX, doc.width) + pad,
            maxY: Math.max(rect.maxY, doc.height) + pad,
          };
          const scale = Math.max((b.maxX - b.minX) / w, (b.maxY - b.minY) / hgt);
          const tx = (b.minX + b.maxX) / 2 - (w / 2) * scale;
          const ty = (b.minY + b.maxY) / 2 - (hgt / 2) * scale;
          const toS = (p: { x: number; y: number }) => ({ x: (p.x - tx) / scale, y: (p.y - ty) / scale });

          // sheet outline
          const a0 = toS({ x: 0, y: 0 });
          const a1 = toS({ x: doc.width, y: doc.height });
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1;
          ctx.strokeRect(a0.x, a0.y, a1.x - a0.x, a1.y - a0.y);

          for (const f of doc.features) {
            if (!f.visible) continue;
            const rings = f.geom === 'area' ? f.rings : featureRings(f);
            // fill
            if (rings.length) {
              ctx.fillStyle = f.geom === 'area' ? f.fillColor ?? 'transparent' : f.strokeColor;
              ctx.globalAlpha = f.geom === 'area' ? Math.max(0.02, f.fillOpacity) : 1;
              for (const ring of rings) {
                ctx.beginPath();
                const p0 = toS(ring[0]);
                ctx.moveTo(p0.x, p0.y);
                for (let i = 1; i < ring.length; i++) {
                  const p = toS(ring[i]);
                  ctx.lineTo(p.x, p.y);
                }
                ctx.closePath();
                ctx.fill();
              }
              ctx.globalAlpha = 1;
            }
            // outline
            const sw = f.geom === 'area' ? f.outlineWidth || f.lineWidth : f.lineWidth;
            if (rings.length && sw > 0) {
              ctx.strokeStyle = f.strokeColor;
              ctx.lineWidth = Math.max(1, sw / scale);
              ctx.setLineDash(f.strokeStyle === 'dashed' ? [Math.max(3, (sw * 4) / scale), Math.max(2, (sw * 2) / scale)] : []);
              for (const ring of rings) {
                ctx.beginPath();
                const p0 = toS(ring[0]);
                ctx.moveTo(p0.x, p0.y);
                for (let i = 1; i < ring.length; i++) {
                  const p = toS(ring[i]);
                  ctx.lineTo(p.x, p.y);
                }
                ctx.closePath();
                ctx.stroke();
              }
              ctx.setLineDash([]);
            }
            // hatch
            if (f.hatch && rings.length) {
              const stripes = generateHatchVariants(rings, f.hatch);
              ctx.lineCap = 'butt';
              for (let i = 0; i < stripes.length; i++) {
                const st = stripes[i];
                const c = f.hatch.color2 && i % 2 === 1 ? f.hatch.color2 : f.hatch.color;
                ctx.strokeStyle = c;
                ctx.globalAlpha = f.hatch.alpha;
                ctx.lineWidth = Math.max(1, st.width / scale);
                const p0 = toS({ x: st.x0, y: st.y0 });
                const p1 = toS({ x: st.x1, y: st.y1 });
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
              }
              ctx.globalAlpha = 1;
            }
          }
        };
        if (leftRef.value) draw(leftRef.value, submission.value?.doc ?? null);
        if (rightRef.value) draw(rightRef.value, task.value?.referenceDoc ?? null);
      });
    };

    watch([submission, task], renderThumbs, { flush: 'post' });
    onBeforeUnmount(() => cancelAnimationFrame(thumbRaf));

    // toggling the student/teacher view re-fetches so the reference drawing is
    // present for teachers and withheld for students
    watch(isStudent, async (student) => {
      if (!submission.value) return;
      task.value = await api.task(submission.value.taskId, student ? undefined : 'teacher');
      setTimeout(renderThumbs, 60);
    });

    const types: Record<string, string> = {
      missing: '缺失',
      extra: '多余',
      width: '线宽',
      closure: '闭合',
      position: '位置',
      style: '样式',
    };

    return () =>
      loading.value
        ? h('div', { class: 'empty' }, '加载中…')
        : !submission.value
          ? h('div', { class: 'empty' }, '找不到该提交')
          : h('div', { class: 'page' }, [
              h('div', { class: 'page-inner' }, [
                h('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap' }, [
                  h('button', { class: 'ghost icon', onClick: () => router.push(`/training/${submission.value!.taskId}`) }, [h(Icon, { name: 'back', size: 16 })]),
                  h('h1', { style: 'margin:0' }, `${submission.value.studentName} · ${task.value?.title ?? ''}`),
                  h('span', { class: `status-badge ${submission.value.status}` }, submission.value.status === 'submitted' ? '待复核' : submission.value.status === 'reviewed' ? '已复核' : '草稿'),
                ]),
                h('div', { class: 'sub' }, `提交时间 ${formatDate(submission.value.submittedAt ?? submission.value.updatedAt)}`),

                h('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px' }, [
                  scoreCard('自动评分', autoTotal.value, '#38bdf8'),
                  scoreCard('建议复核分', suggested.value, '#f2c200'),
                  scoreCard('最终成绩', finalScore.value ?? '—', '#22c55e'),
                  scoreCard('扣分项', effectiveItems.value.filter((i) => i.deduction > 0).length, '#ef4444'),
                ]),

                h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px' }, [
                  thumbCard('学员成果', submission.value.doc, leftRef),
                  thumbCard('参考答案', task.value?.referenceDoc ?? null, rightRef),
                ]),

                autoTotal.value !== suggested.value
                  ? h('div', { class: 'card', style: 'margin-bottom:14px;border-color:rgba(242,194,0,.35);background:rgba(242,194,0,.06)' }, [
                      h('div', { style: 'display:flex;gap:10px;align-items:flex-start' }, [
                        h(Icon, { name: 'warning', size: 15 }),
                        h('div', null, [
                          h('div', { style: 'font-weight:600;margin-bottom:3px' }, '这份提交是按旧评分规则计算的'),
                          h('div', { class: 'hint', style: 'line-height:1.6' }, `存储的自动分 ${autoTotal.value} 与当前明细扣分合计不一致。以逐条扣分为准时建议 ${suggested.value} 分；确认后点「采用建议分」即可。重新提交会按最新规则重算。`),
                        ]),
                      ]),
                    ])
                  : null,
                h('div', { class: 'card', style: 'margin-bottom:16px' }, [
                  h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px' }, [
                    h('h3', { style: 'margin:0' }, '评分明细与错题'),
                    h('button', { class: 'ghost', onClick: () => (isStudent.value = !isStudent.value), title: '在学员视角与老师视角之间切换' }, isStudent.value ? '切换为老师视角' : '切换为学员视角'),
                    autoTotal.value !== 0
                      ? h('span', { class: 'hint' }, [
                          '覆盖度 ', String((submission.value.autoGrade?.coverageScore ?? 0) * 100).slice(0, 5), '% · ',
                          '线宽 ', String((submission.value.autoGrade?.widthScore ?? 0) * 100).slice(0, 5), '% · ',
                          '闭合 ', String((submission.value.autoGrade?.closureScore ?? 0) * 100).slice(0, 5), '%',
                        ])
                      : null,
                  ]),
                  effectiveItems.value.length === 0
                    ? h('div', { class: 'empty' }, '没有发现明显问题 🎉')
                    : h('table', { class: 'table' }, [
                        h('thead', null, [
                          h('tr', null, [
                            h('th', { style: 'width:60px' }, '类型'),
                            h('th', null, '问题'),
                            h('th', null, '期望 / 实际'),
                            h('th', { style: 'width:110px' }, '扣分'),
                            !isStudent.value ? h('th', { style: 'width:200px' }, '复核调整') : null,
                          ]),
                        ]),
                        h('tbody', null, effectiveItems.value.map((it) => {
                          const original = submission.value!.autoGrade?.items.find((x) => x.id === it.id);
                          return h('tr', { key: it.id, style: activeItem.value === it.id ? 'background:var(--panel-2)' : '' }, [
                            h('td', null, h('span', { class: `pill ${it.deduction > 0 ? 'err' : ''}` }, types[it.type] ?? it.type)),
                            h('td', null, [
                              h('div', { style: 'font-size:12.5px;font-weight:500;margin-bottom:2px' }, it.title),
                              h('div', { class: 'hint', style: 'line-height:1.5' }, it.detail),
                            ]),
                            h('td', { class: 'hint mono', style: 'line-height:1.5' }, [it.expected ? `${it.expected}` : null, it.expected && it.actual ? ' / ' : null, it.actual ?? null].filter(Boolean).join('') || '—'),
                            h('td', null, [
                              h('div', { class: 'mono', style: 'font-weight:600' }, String(Math.round(it.deduction))),
                              original && original.deduction !== it.deduction ? h('div', { class: 'hint', style: 'text-decoration:line-through' }, String(original.deduction)) : null,
                            ]),
                            !isStudent.value
                              ? h('td', null, [
                                  h('div', { style: 'display:flex;gap:4px;align-items:center' }, [
                                    h('input', {
                                      type: 'number',
                                      value: Math.round(it.deduction),
                                      style: 'width:62px',
                                      onInput: (e: Event) => setDeduction(it.id, Number((e.target as HTMLInputElement).value)),
                                    }),
                                    h('input', {
                                      type: 'text',
                                      placeholder: '评语',
                                      value: adjustments.value[it.id]?.comment ?? '',
                                      style: 'flex:1',
                                      onInput: (e: Event) => {
                                        const v = (e.target as HTMLInputElement).value;
                                        adjustments.value = { ...adjustments.value, [it.id]: { deduction: adjustments.value[it.id]?.deduction ?? it.deduction, comment: v } };
                                      },
                                    }),
                                  ]),
                                ])
                              : null,
                          ]);
                        })),
                      ]),
                ]),

                !isStudent.value
                  ? h('div', { class: 'card' }, [
                      h('h3', null, '老师复核'),
                      h('div', { style: 'display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap' }, [
                        h('label', { class: 'hint' }, '最终成绩'),
                        h('input', {
                          type: 'number',
                          min: 0,
                          max: 100,
                          value: finalScore.value ?? suggested.value,
                          style: 'width:90px;font-size:18px;font-weight:600',
                          onInput: (e: Event) => (finalScore.value = Number((e.target as HTMLInputElement).value)),
                        }),
                        h('button', { class: 'ghost', onClick: () => (finalScore.value = suggested.value) }, '采用建议分'),
                        h('div', { style: 'flex:1' }),
                        h('span', { class: 'hint' }, '复核意见会随成绩一起展示给学员'),
                      ]),
                      h('textarea', {
                        rows: 3,
                        placeholder: '例如：整体布局正确，3 号通道宽度偏窄，另需补画人行连廊。已手动调整扣分。',
                        value: remark.value,
                        style: 'width:100%;resize:vertical;margin-bottom:12px',
                        onInput: (e: Event) => (remark.value = (e.target as HTMLTextAreaElement).value),
                      }),
                      h('div', { style: 'display:flex;gap:8px;justify-content:flex-end' }, [
                        h('button', { onClick: () => router.push(`/summary/${submission.value!.taskId}`) }, [h(Icon, { name: 'chart', size: 14 }), '成绩汇总']),
                        h('button', { class: 'primary', onClick: saveReview, disabled: saving.value }, [h(Icon, { name: 'check', size: 14 }), saving.value ? '保存中…' : '保存复核结果']),
                      ]),
                    ])
                  : h('div', { class: 'card' }, [
                      h('h3', null, '老师复核意见'),
                      submission.value.review
                        ? h('div', null, [
                            h('div', { style: 'display:flex;align-items:center;gap:12px;margin-bottom:8px' }, [
                              h('span', { class: 'score' }, String(submission.value.review.finalScore ?? '—')),
                              h('span', { class: 'hint' }, `复核人 ${submission.value.review.reviewer || '—'} · ${formatDate(submission.value.review.reviewedAt)}`),
                            ]),
                            h('div', { class: 'hint', style: 'line-height:1.7' }, submission.value.review.remark || '（无评语）'),
                          ])
                        : h('div', { class: 'hint' }, '老师尚未复核，当前显示自动评分。'),
                    ]),
              ]),
            ]);

    function scoreCard(label: string, value: number | string, color: string) {
      return h('div', { class: 'card', style: 'padding:14px 16px' }, [
        h('div', { class: 'hint' }, label),
        h('div', { class: 'score', style: `color:${color}` }, String(value)),
      ]);
    }

    function thumbCard(title: string, doc: any, refEl: any) {
      return h('div', { class: 'card', style: 'padding:10px' }, [
        h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px' }, [
          h('span', { style: 'font-size:12px;font-weight:600' }, title),
          doc ? h('span', { class: 'hint mono' }, `${doc.features.length} 个对象`) : h('span', { class: 'pill warn' }, '不可见（学员端不返回参考答案）'),
        ]),
        h('div', { style: 'position:relative;height:300px;background:#f8fafc;border-radius:6px;overflow:hidden;border:1px solid var(--border)' }, [
          h('canvas', { ref: refEl, style: 'position:absolute;inset:0;width:100%;height:100%' }),
          h('canvas', { class: 'thumb-overlay', style: 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none' }),
        ]),
      ]);
    }
  },
});

import { computed, defineComponent, h, onMounted, ref, watch, type VNode } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import PlanCanvas from '@/components/PlanCanvas';
import Icon from '@/components/Icon';
import { KIND_ORDER, KIND_PRESETS, featureBoundsInclStroke } from '@/core/feature';
import { exportGeoJson, exportLengthList, exportSvg } from '@/core/svg';
import { api } from '@/api';
import { store, emptyDoc, type ToolId } from '@/state/editor';
import { closureReport } from '@/core/feature';
import type { Feature, FeatureKind } from '@shared/types';
import { downloadText, downloadBlob, formatDate, cloneJson } from '@/util/download';
import { hatchCountOf } from '@/core/grading';

interface ToolDef {
  id: ToolId;
  icon: string;
  label: string;
  key: string;
  group: number;
}

const TOOLS: ToolDef[] = [
  { id: 'select', icon: 'select', label: '选择 / 编辑顶点', key: 'V', group: 0 },
  { id: 'pan', icon: 'pan', label: '平移视图', key: 'H', group: 0 },
  { id: 'channel', icon: 'channel', label: '主通道线', key: 'C', group: 1 },
  { id: 'walkway', icon: 'walkway', label: '人行通道线', key: 'W', group: 1 },
  { id: 'firelane', icon: 'fire', label: '消防通道线', key: 'F', group: 1 },
  { id: 'park', icon: 'park', label: '禁停区', key: 'N', group: 2 },
  { id: 'station', icon: 'station', label: '工位框', key: 'S', group: 2 },
  { id: 'material', icon: 'material', label: '物料区', key: 'M', group: 2 },
  { id: 'hazard', icon: 'hazard', label: '危险区', key: 'D', group: 2 },
  { id: 'rect', icon: 'rect', label: '矩形区域', key: 'R', group: 2 },
  { id: 'polygon', icon: 'polygon', label: '多边形区域', key: 'P', group: 2 },
  { id: 'measure', icon: 'ruler', label: '测量', key: 'T', group: 3 },
];

export default defineComponent({
  name: 'EditorView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const saving = ref(false);
    const showSave = ref(false);
    const saveName = ref('');
    const saveNote = ref('');
    const bgLoading = ref(false);
    const rightTab = ref<'props' | 'layers'>('props');
    const versions = ref<{ id: string; name: string; note: string; createdAt: string; author: string }[]>([]);
    const showVersions = ref(false);
    const showExport = ref(false);
    const showCalibrate = ref(false);
    const showLeft = ref(false);
    const showRight = ref(false);
    const calibMetres = ref(6);

    const selected = computed(() => store.selectedFeatures);
    const single = computed<Feature | null>(() => (selected.value.length === 1 ? selected.value[0] : null));
    const closure = computed(() => (single.value ? closureReport(single.value) : null));
    const hatchCount = computed(() => (single.value ? hatchCountOf(single.value) : 0));

    const loadPlan = async (id: string) => {
      try {
        const plan = await api.plan(id);
        // A version restored from the versions page arrives through localStorage so
        // the editor opens the snapshot rather than the current head.
        let doc = plan.doc;
        let restoredName: string | null = null;
        try {
          const pendingPlan = localStorage.getItem('marking.pendingPlan');
          const pendingDoc = localStorage.getItem('marking.pendingDoc');
          if (pendingPlan === id && pendingDoc) {
            doc = JSON.parse(pendingDoc);
            restoredName = doc.name ?? null;
            localStorage.removeItem('marking.pendingPlan');
            localStorage.removeItem('marking.pendingDoc');
          }
        } catch {
          /* ignore a corrupt handoff */
        }
        store.setDoc(doc, { resetHistory: true });
        store.planId.value = plan.id;
        store.planName.value = plan.name;
        store.workshopId.value = plan.workshopId;
        store.docDirty.value = !!restoredName;
        if (restoredName) store.toast('已载入版本快照，保存后才会写入方案', 'info');
        store.zoomToFitDoc();
        const vs = await api.versions(plan.id);
        versions.value = vs.map((v) => ({ id: v.id, name: v.name, note: v.note, createdAt: v.createdAt, author: v.author }));
      } catch (e: any) {
        store.toast(`载入方案失败：${e.message}`, 'error');
      }
    };

    onMounted(async () => {
      const id = route.params.id as string | undefined;
      if (id) await loadPlan(id);
      else {
        store.setDoc(emptyDoc('未命名方案'), { resetHistory: true });
        store.planId.value = null;
      }
    });

    watch(
      () => route.params.id,
      (id) => {
        if (typeof id === 'string' && id && id !== store.planId.value) loadPlan(id);
      }
    );

    const save = async (asVersion: boolean) => {
      saving.value = true;
      try {
        const plan = await api.savePlan({
          id: store.planId.value,
          name: saveName.value || store.doc.value.name,
          workshopId: store.workshopId.value,
          doc: { ...store.doc.value, name: saveName.value || store.doc.value.name },
          createVersion: asVersion,
          versionName: asVersion ? saveNote.value || `v${versions.value.length + 1}` : undefined,
          versionNote: asVersion ? saveNote.value : undefined,
          author: localStorage.getItem('marking.user') ?? 'EHS 管理员',
        });
        store.planId.value = plan.id;
        store.planName.value = plan.name;
        store.docDirty.value = false;
        store.toast(asVersion ? `已保存并发布版本「${saveNote.value || plan.name}」` : '方案已保存', 'success');
        const vs = await api.versions(plan.id);
        versions.value = vs.map((v) => ({ id: v.id, name: v.name, note: v.note, createdAt: v.createdAt, author: v.author }));
        showSave.value = false;
        if (!route.params.id) router.replace(`/editor/${plan.id}`);
      } catch (e: any) {
        store.toast(`保存失败：${e.message}`, 'error');
      } finally {
        saving.value = false;
      }
    };

    const openSave = () => {
      saveName.value = store.doc.value.name;
      saveNote.value = '';
      showSave.value = true;
    };

    const uploadBackground = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      bgLoading.value = true;
      try {
        const { id, url } = await api.uploadAsset(file);
        const img = new Image();
        img.src = url;
        await img.decode().catch(() => {});
        // Fit the image inside the current drawing sheet, preserving aspect ratio, so
        // existing features keep their coordinates. If the sheet is still the default
        // blank size we adopt a plain 1 px = 10 mm mapping and let calibration fix it.
        const doc = store.doc.value;
        const sheetW = Math.max(1000, doc.width);
        const sheetH = Math.max(1000, doc.height);
        const aspect = img.width && img.height ? img.width / img.height : sheetW / sheetH;
        let w = sheetW;
        let hgt = w / aspect;
        if (hgt > sheetH) {
          hgt = sheetH;
          w = hgt * aspect;
        }
        store.setBackground({
          assetId: id,
          url,
          x: (sheetW - w) / 2,
          y: (sheetH - hgt) / 2,
          width: w,
          height: hgt,
          opacity: 0.55,
          visible: true,
        });
        store.zoomToFitDoc();
        store.toast('底图已载入。若需真实尺寸，请用「校准」按已知长度标定。', 'success');
      } catch (err: any) {
        store.toast(`底图上传失败：${err.message}`, 'error');
      } finally {
        bgLoading.value = false;
      }
    };

    const doExportSvg = () => {
      const svg = exportSvg(store.doc.value, { includeDimensions: true, title: store.doc.value.name });
      downloadText(`${store.doc.value.name || '标线方案'}.svg`, svg, 'image/svg+xml');
      store.toast('已导出 SVG（1 单位 = 1 毫米，可 1:1 打印）', 'success');
    };
    const doExportGeo = () => {
      downloadText(`${store.doc.value.name || '标线方案'}.geojson`, exportGeoJson(store.doc.value), 'application/geo+json');
      store.toast('已导出 GeoJSON', 'success');
    };
    const doExportList = () => {
      downloadText(`${store.doc.value.name || '标线方案'}-工程量.csv`, exportLengthList(store.doc.value), 'text/csv');
      store.toast('已导出工程量清单', 'success');
    };

    const restoreVersion = async (versionId: string) => {
      const v = versions.value.find((x) => x.id === versionId);
      if (!v) return;
      const full = await api.versions(store.planId.value!);
      const match = full.find((x) => x.id === versionId);
      if (!match) return;
      store.edit(`恢复版本「${match.name}」`, () => cloneJson(match.doc));
      store.toast(`已载入版本「${match.name}」（未保存，可撤销）`, 'success');
    };

    // ---- render helpers -------------------------------------------------

    const toolRail = () =>
      h('aside', { class: 'toolrail' }, [
        ...TOOLS.map((t, i) => {
          const prev = TOOLS[i - 1];
          const nodes: VNode[] = [];
          if (prev && prev.group !== t.group) nodes.push(h('div', { class: 'divider' }));
          nodes.push(
            h(
              'button',
              {
                key: t.id,
                class: ['tool', { active: store.tool.value === t.id }],
                title: `${t.label} (${t.key})`,
                onClick: () => {
                  store.tool.value = t.id;
                  store.draft.value = null;
                },
              },
              [h(Icon, { name: t.icon, size: 18 }), h('span', { class: 'key' }, t.key)]
            )
          );
          return nodes;
        }).flat(),
        h('div', { class: 'divider' }),
        h(
          'button',
          { class: 'tool', title: '撤销 Ctrl+Z', disabled: !store.history.canUndo, onClick: () => store.undo() },
          [h(Icon, { name: 'undo', size: 17 })]
        ),
        h(
          'button',
          { class: 'tool', title: '重做 Ctrl+Shift+Z', disabled: !store.history.canRedo, onClick: () => store.redo() },
          [h(Icon, { name: 'redo', size: 17 })]
        ),
        h('div', { class: 'divider' }),
        h('button', { class: 'tool', title: '适应窗口', onClick: () => store.fitToContent() }, [h(Icon, { name: 'fit', size: 17 })]),
      ]);

    const libraryPanel = () =>
      h('aside', { class: ['sidebar', { shown: showLeft.value }] }, [
        h('div', { class: 'sidebar-header' }, [
          h('span', null, '规范图元库'),
          h('span', { class: 'pill' }, `${store.features.length} 个对象`),
        ]),
        h('div', { class: 'sidebar-body' }, [
          h(
            'div',
            { style: 'padding:8px 10px 4px' },
            KIND_ORDER.map((kind) => {
              const p = KIND_PRESETS[kind];
              return h(
                'button',
                {
                  class: 'lib-item',
                  style: 'width:100%;justify-content:flex-start;margin-bottom:5px;padding:7px 9px;background:var(--panel-2)',
                  onClick: () => {
                    store.tool.value = (
                      kind === 'main-channel' ? 'channel' : kind === 'walkway' ? 'walkway' : kind === 'fire-lane' ? 'firelane' : kind === 'no-park' ? 'park' : kind === 'station' ? 'station' : kind === 'material' ? 'material' : 'hazard'
                    ) as ToolId;
                    store.toast(`${p.label}：${p.geom === 'path' ? '点击起点、逐点绘制、双击结束' : '拖拽画出矩形（Alt 改用多边形）'}`, 'info');
                  },
                },
                [
                  h('span', {
                    class: 'swatch',
                    style: `background:${p.color};width:10px;height:10px;border-radius:2px;flex:0 0 10px`,
                  }),
                  h('span', { style: 'flex:1;text-align:left' }, p.label),
                  h('span', { class: 'tag' }, p.geom === 'path' ? '线' : '面'),
                ]
              );
            })
          ),
          h('div', { style: 'padding:4px 10px 12px' }, [
            h('div', { class: 'hint' }, [
              h('div', null, '绘制线：单击起点 → 逐点单击 → 双击 / Enter 结束。'),
              h('div', null, '绘制面：拖拽出矩形；按住 Alt 逐点多边形，双击闭合。'),
              h('div', null, '吸附：端点、中点、线上、网格自动吸附，按住 Shift 约束 15° 角。'),
            ]),
          ]),
        ]),
      ]);

    const layersList = () =>
      h('aside', { class: 'inspector' }, [
        h('div', { class: 'sidebar-header' }, [
          h('span', null, '图层'),
          h('div', { style: 'display:flex;gap:4px' }, [
            h('button', { class: 'ghost icon', title: '全选', onClick: () => store.selectAll() }, [h(Icon, { name: 'check', size: 14 })]),
            h(
              'button',
              { class: 'ghost icon', title: '删除选中', disabled: !store.selection.value.length, onClick: () => store.deleteSelected() },
              [h(Icon, { name: 'trash', size: 14 })]
            ),
          ]),
        ]),
        h(
          'div',
          { class: 'sidebar-body' },
          store.features.length === 0
            ? [h('div', { class: 'empty' }, '还没有标线对象。\n从左侧图元库选择类型，在图纸上开始绘制。')]
            : [
                h(
                  'div',
                  { class: 'layer-list' },
                  [...store.features].reverse().map((f) =>
                    h(
                      'div',
                      {
                        key: f.id,
                        class: ['layer-item', { selected: store.selection.value.includes(f.id) }],
                        onClick: (e: MouseEvent) => {
                          if (e.shiftKey) store.toggleSelect(f.id);
                          else store.select([f.id]);
                        },
                        onDblclick: () => store.fitToSelection(),
                      },
                      [
                        h('span', {
                          class: 'swatch',
                          style: `background:${f.geom === 'path' ? f.strokeColor : f.fillColor ?? f.strokeColor}`,
                        }),
                        h('span', { class: 'name', title: f.name }, f.name),
                        h('span', { class: 'meta' }, f.geom === 'path' ? `${f.lineWidth}mm` : `${f.rings.length}环`),
                        h(
                          'span',
                          {
                            class: 'eye',
                            title: f.visible ? '隐藏' : '显示',
                            onClick: (e: MouseEvent) => {
                              e.stopPropagation();
                              store.patch(f.id, { visible: !f.visible }, f.visible ? '隐藏对象' : '显示对象');
                            },
                          },
                          [h(Icon, { name: f.visible ? 'eye' : 'eyeOff', size: 13 })]
                        ),
                      ]
                    )
                  )
                ),
              ]
        ),
      ]);

    // ---- inspector ------------------------------------------------------

    const numRow = (label: string, value: number, oninput: (v: number) => void, opts: { step?: number; min?: number; unit?: string } = {}) =>
      h('div', { class: 'row', title: `${label}${opts.unit ? ' (' + opts.unit + ')' : ''}` }, [
        h('label', null, label),
        h('input', {
          type: 'number',
          value,
          step: opts.step ?? 1,
          min: opts.min,
          title: opts.unit ? `${label}（${opts.unit}）` : label,
          onInput: (e: Event) => {
            const v = Number((e.target as HTMLInputElement).value);
            if (Number.isFinite(v)) oninput(v);
          },
        }),
      ]);

    const colorRow = (label: string, value: string, oninput: (v: string) => void) =>
      h('div', { class: 'row' }, [
        h('label', null, label),
        h('input', { type: 'color', value, onInput: (e: Event) => oninput((e.target as HTMLInputElement).value) }),
        h('input', {
          type: 'text',
          value,
          style: 'flex:1',
          onInput: (e: Event) => oninput((e.target as HTMLInputElement).value),
        }),
      ]);

    const propsPanel = () => {
      const f = single.value;
      if (!f) {
        return h('aside', { class: 'inspector' }, [
          h('div', { class: 'sidebar-header' }, [h('span', null, '属性'), h('span', { class: 'pill' }, '未选择')]),
          h('div', { class: 'sidebar-body' }, [
            selectionState(),
            docSettings(),
          ]),
        ]);
      }
      const patch = (p: Partial<Feature>, label = '修改属性', coalesce?: string) => store.patch(f.id, p, label, coalesce);
      return h('aside', { class: 'inspector' }, [
        h('div', { class: 'sidebar-header' }, [
          h('span', null, '属性'),
          h('span', { class: closure.value?.closed ? 'pill ok' : 'pill err' }, closure.value?.closed ? '闭合正常' : '轮廓异常'),
        ]),
        h('div', { class: 'sidebar-body' }, [
          h('div', { class: 'section' }, [
            h('div', { class: 'section-title' }, [h('span', null, '基本'), h('span', { class: 'tag' }, KIND_PRESETS[f.kind].label)]),
            h('div', { class: 'row' }, [
              h('label', null, '名称'),
              h('input', { type: 'text', value: f.name, onInput: (e: Event) => patch({ name: (e.target as HTMLInputElement).value }, '重命名', 'rename') }),
            ]),
            h('div', { class: 'row' }, [
              h('label', null, '类型'),
              h(
                'select',
                {
                  value: f.kind,
                  onChange: (e: Event) => {
                    const kind = (e.target as HTMLSelectElement).value as FeatureKind;
                    const preset = KIND_PRESETS[kind];
                    store.patch(f.id, { kind, ...structuredClone(preset.style) }, '更换类型');
                  },
                },
                KIND_ORDER.map((k) => h('option', { value: k }, KIND_PRESETS[k].label))
              ),
            ]),
            h('div', { class: 'grid2' }, [
              numRow(f.geom === 'area' ? '边框宽' : '线宽', f.geom === 'area' ? f.outlineWidth || f.lineWidth : f.lineWidth, (v) =>
                patch(f.geom === 'area' ? { outlineWidth: v, lineWidth: v } : { lineWidth: v }, '线宽', 'lw'),
                { step: 10, min: 1, unit: 'mm' }
              ),
              h('div', { class: 'row tight' }, [
                h('label', null, '可见'),
                h('input', { type: 'checkbox', checked: f.visible, onChange: (e: Event) => patch({ visible: (e.target as HTMLInputElement).checked }, '切换可见') }),
                h('label', { style: 'flex:0 0 auto;margin-left:6px' }, '锁定'),
                h('input', { type: 'checkbox', checked: f.locked, onChange: (e: Event) => patch({ locked: (e.target as HTMLInputElement).checked }, '锁定对象') }),
              ]),
            ]),
            colorRow('线条色', f.strokeColor, (v) => patch({ strokeColor: v }, '线条颜色', 'stroke')),
            f.geom === 'area'
              ? h('div', null, [
                  colorRow('填充色', f.fillColor ?? '#000000', (v) => patch({ fillColor: v }, '填充颜色', 'fill')),
                  h('div', { class: 'row' }, [
                    h('label', null, '填充透明'),
                    h('input', {
                      type: 'range',
                      min: 0,
                      max: 1,
                      step: 0.02,
                      value: f.fillOpacity,
                      onInput: (e: Event) => patch({ fillOpacity: Number((e.target as HTMLInputElement).value) }, '填充透明度', 'fo'),
                    }),
                    h('span', { class: 'hint mono', style: 'width:32px' }, f.fillOpacity.toFixed(2)),
                  ]),
                ])
              : null,
            h('div', { class: 'row' }, [
              h('label', null, '线型'),
              h(
                'select',
                { value: f.strokeStyle, onChange: (e: Event) => patch({ strokeStyle: (e.target as HTMLSelectElement).value as Feature['strokeStyle'] }, '线型') },
                [
                  h('option', { value: 'solid' }, '实线'),
                  h('option', { value: 'dashed' }, '虚线'),
                  h('option', { value: 'dotted' }, '点线'),
                ]
              ),
            ]),
          ]),
          hatchSection(f, patch),
          geometrySection(f, patch),
          h('div', { class: 'section' }, [
            h('div', { class: 'section-title' }, [h('span', null, '规范说明')]),
            h('div', { class: 'hint' }, KIND_PRESETS[f.kind].spec),
            f.geom === 'path'
              ? h('div', { class: 'hint', style: 'margin-top:6px' }, [
                  h('div', null, `中心线：${f.paths.length} 条，总长 `),
                  h('span', { class: 'mono' }, `${(f.paths.reduce((a, p) => a + p.slice(1).reduce((s, q, i) => s + Math.hypot(q.x - p[i].x, q.y - p[i].y), 0), 0) / 1000).toFixed(2)} m`),
                ])
              : h('div', { class: 'hint', style: 'margin-top:6px' }, `轮廓：${f.rings.length} 环 · ${f.rings.reduce((a, r) => a + r.length, 0)} 顶点`),
          ]),
          h('div', { class: 'section' }, [
            h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, [
              h('button', { onClick: () => store.duplicateSelected() }, [h(Icon, { name: 'copy', size: 13 }), '复制']),
              h('button', { onClick: () => store.rotate(90) }, '旋转 90°'),
              h('button', { onClick: () => store.flip('h') }, '水平镜像'),
              h('button', { onClick: () => store.flip('v') }, '垂直镜像'),
              h('button', { class: 'danger', onClick: () => store.deleteSelected() }, [h(Icon, { name: 'trash', size: 13 }), '删除']),
            ]),
          ]),
        ]),
      ]);
    };

    const hatchSection = (f: Feature, patch: (p: Partial<Feature>, l?: string, c?: string) => void) => {
      const hatch = f.hatch;
      return h('div', { class: 'section' }, [
        h('div', { class: 'section-title' }, [
          h('span', null, '斜纹填充'),
          h('span', { class: hatch ? 'pill ok' : 'pill' }, hatch ? `${hatchCount.value} 条` : '无'),
        ]),
        h('div', { class: 'row' }, [
          h('label', null, '样式'),
          h(
            'select',
            {
              value: hatch?.type ?? 'none',
              onChange: (e: Event) => {
                const v = (e.target as HTMLSelectElement).value;
                if (v === 'none') store.setHatchForSelection(null);
                else store.setHatchForSelection({ type: v as 'diagonal' | 'cross' | 'grid' | 'dots' });
              },
            },
            [
              h('option', { value: 'none' }, '无填充'),
              h('option', { value: 'diagonal' }, '单向斜纹'),
              h('option', { value: 'cross' }, '交叉斜纹'),
              h('option', { value: 'grid' }, '网格'),
              h('option', { value: 'dots' }, '点阵'),
            ]
          ),
        ]),
        hatch
          ? h('div', null, [
              h('div', { class: 'grid2' }, [
                numRow('间距', hatch.spacing, (v) => store.setHatchForSelection({ spacing: Math.max(10, v) }), { step: 10, min: 10, unit: 'mm' }),
                numRow('角度', hatch.angle, (v) => store.setHatchForSelection({ angle: v }), { step: 5, unit: '°' }),
                numRow('纹宽', hatch.lineWidth, (v) => store.setHatchForSelection({ lineWidth: v }), { step: 5, min: 1, unit: 'mm' }),
              ]),
              colorRow('主色', hatch.color, (v) => store.setHatchForSelection({ color: v })),
              h('div', { class: 'row' }, [
                h('label', null, '交替色'),
                h('input', { type: 'color', value: hatch.color2 ?? '#1a1a1a', onInput: (e: Event) => store.setHatchForSelection({ color2: (e.target as HTMLInputElement).value }) }),
                h('button', { class: 'ghost', onClick: () => store.setHatchForSelection({ color2: undefined }) }, '取消交替'),
              ]),
              h('div', { class: 'row' }, [
                h('label', null, '透明'),
                h('input', {
                  type: 'range',
                  min: 0.1,
                  max: 1,
                  step: 0.05,
                  value: hatch.alpha,
                  onInput: (e: Event) => store.setHatchForSelection({ alpha: Number((e.target as HTMLInputElement).value) }),
                }),
              ]),
              h('div', { class: 'hint' }, '实时预览由 WebGPU 单次实例化绘制批量生成，黄色/黑色交替纹无需离线渲染。'),
            ])
          : h('div', { class: 'hint' }, '禁停区、危险区按规范需斜纹填充；选择样式后立即生效。'),
        void patch,
      ]);
    };

    const geometrySection = (f: Feature, patch: (p: Partial<Feature>, l?: string, c?: string) => void) => {
      const b = featureBoundsInclStroke(f);
      return h('div', { class: 'section' }, [
        h('div', { class: 'section-title' }, [h('span', null, '几何')]),
        h('div', { class: 'grid2' }, [
          h('div', { class: 'row tight' }, [h('label', null, 'X'), h('span', { class: 'mono' }, `${(b.minX / 1000).toFixed(3)} m`)]),
          h('div', { class: 'row tight' }, [h('label', null, 'Y'), h('span', { class: 'mono' }, `${(b.minY / 1000).toFixed(3)} m`)]),
          h('div', { class: 'row tight' }, [h('label', null, '宽'), h('span', { class: 'mono' }, `${((b.maxX - b.minX) / 1000).toFixed(3)} m`)]),
          h('div', { class: 'row tight' }, [h('label', null, '高'), h('span', { class: 'mono' }, `${((b.maxY - b.minY) / 1000).toFixed(3)} m`)]),
        ]),
        closure.value && !closure.value.closed
          ? h('div', { class: 'pill err', style: 'margin-top:6px;white-space:normal;line-height:1.5' }, closure.value.issues.join('；'))
          : null,
        h('div', { style: 'display:flex;gap:6px;margin-top:8px;flex-wrap:wrap' }, [
          h('button', { onClick: () => { store.select([f.id]); store.mergeLines(); } }, [h(Icon, { name: 'merge', size: 13 }), '合并相接线段']),
          h('button', { onClick: () => store.applyPresetToSelection(f.kind) }, '恢复规范样式'),
        ]),
        void patch,
      ]);
    };

    const docSettings = () =>
      h('div', { class: 'section' }, [
        h('div', { class: 'section-title' }, [h('div', null, '图纸与网格')]),
        h('div', { class: 'row' }, [
          h('label', null, '方案名'),
          h('input', { type: 'text', value: store.doc.value.name, onInput: (e: Event) => store.setDocMeta({ name: (e.target as HTMLInputElement).value }) }),
        ]),
        h('div', { class: 'grid2' }, [
          numRow('图纸宽', store.doc.value.width, (v) => store.setDocMeta({ width: Math.max(1000, v) }), { step: 1000, unit: 'mm' }),
          numRow('图纸高', store.doc.value.height, (v) => store.setDocMeta({ height: Math.max(1000, v) }), { step: 1000, unit: 'mm' }),
        ]),
        h('div', { class: 'grid2' }, [
          numRow('细网格', store.grid.minor, (v) => store.updateGrid({ minor: Math.max(10, v) }), { step: 50, unit: 'mm' }),
          numRow('粗网格', store.grid.major, (v) => store.updateGrid({ major: Math.max(100, v) }), { step: 100, unit: 'mm' }),
        ]),
        h('div', { class: 'grid2', style: 'margin-top:4px' }, [
          h('label', { class: 'row tight', style: 'gap:5px' }, [
            h('input', { type: 'checkbox', checked: store.grid.show, onChange: (e: Event) => store.updateGrid({ show: (e.target as HTMLInputElement).checked }) }),
            '显示网格',
          ]),
          h('label', { class: 'row tight', style: 'gap:5px' }, [
            h('input', { type: 'checkbox', checked: store.grid.snapGrid, onChange: (e: Event) => store.updateGrid({ snapGrid: (e.target as HTMLInputElement).checked }) }),
            '吸附网格',
          ]),
          h('label', { class: 'row tight', style: 'gap:5px' }, [
            h('input', { type: 'checkbox', checked: store.grid.snapEndpoints, onChange: (e: Event) => store.updateGrid({ snapEndpoints: (e.target as HTMLInputElement).checked }) }),
            '吸附端点',
          ]),
          h('label', { class: 'row tight', style: 'gap:5px' }, [
            h('input', { type: 'checkbox', checked: store.grid.snapMidpoints, onChange: (e: Event) => store.updateGrid({ snapMidpoints: (e.target as HTMLInputElement).checked }) }),
            '吸附中点',
          ]),
          h('label', { class: 'row tight', style: 'gap:5px' }, [
            h('input', { type: 'checkbox', checked: store.grid.snapSegments, onChange: (e: Event) => store.updateGrid({ snapSegments: (e.target as HTMLInputElement).checked }) }),
            '吸附线段',
          ]),
          h('label', { class: 'row tight', style: 'gap:5px' }, [
            h('input', { type: 'checkbox', checked: store.doc.value.settings.showDimensions, onChange: (e: Event) => store.edit('显示尺寸', (doc) => ({ ...doc, settings: { ...doc.settings, showDimensions: (e.target as HTMLInputElement).checked } })) }),
            '显示尺寸',
          ]),
        ]),
        store.doc.value.background
          ? h('div', { style: 'margin-top:8px' }, [
              h('div', { class: 'row' }, [
                h('label', null, '底图透明'),
                h('input', {
                  type: 'range',
                  min: 0.05,
                  max: 1,
                  step: 0.05,
                  value: store.doc.value.background.opacity,
                  onInput: (e: Event) =>
                    store.edit('底图透明度', (doc) => ({
                      ...doc,
                      background: doc.background ? { ...doc.background, opacity: Number((e.target as HTMLInputElement).value) } : null,
                    }), { coalesce: 'bg-opacity' }),
                }),
              ]),
              h('div', { class: 'hint' }, '底图仅作参考，不计入导出 SVG 的标线图层（但会作为概览图嵌入）。'),
            ])
          : h('div', { class: 'hint', style: 'margin-top:8px' }, '尚未设置底图。上传厂房平面图后可在其上方绘制标线。'),
      ]);

    const selectionState = () => {
      if (store.selection.value.length === 0)
        return h('div', { class: 'section' }, [
          h('div', { class: 'section-title' }, [h('span', null, '提示')]),
          h('div', { class: 'hint' }, [
            h('div', null, '· 单击对象选中，Shift 加选，框选批量选择'),
            h('div', null, '· 双击线段可插入顶点'),
            h('div', null, '· 选中多个对象后可布尔运算、对齐、等距分布'),
            h('div', null, '· 按住空格拖拽平移视图，滚轮缩放'),
          ]),
        ]);
      return h('div', { class: 'section' }, [
        h('div', { class: 'section-title' }, [h('span', null, '多选操作'), h('span', { class: 'pill' }, `${store.selection.value.length} 个`) ]),
        h('div', { class: 'grid2', style: 'gap:5px' }, [
          h('button', { onClick: () => store.booleanOp('union') }, [h(Icon, { name: 'union', size: 13 }), '并集']),
          h('button', { onClick: () => store.booleanOp('difference') }, [h(Icon, { name: 'subtract', size: 13 }), '差集']),
          h('button', { onClick: () => store.booleanOp('intersection') }, [h(Icon, { name: 'intersect', size: 13 }), '交集']),
          h('button', { onClick: () => store.booleanOp('xor') }, [h(Icon, { name: 'xor', size: 13 }), '异或']),
        ]),
        h('div', { class: 'hint', style: 'margin-top:6px' }, '差集：第一个选中的对象为主体，其余作为裁剪。'),
        h('div', { style: 'margin-top:8px' }, [
          h('div', { class: 'section-title' }, [h('span', null, '对齐')]),
          h('div', { class: 'grid6' }, [
            h('button', { class: 'ghost icon', title: '左对齐', onClick: () => store.align('left') }, [h(Icon, { name: 'alignLeft', size: 15 })]),
            h('button', { class: 'ghost icon', title: '水平居中', onClick: () => store.align('hcenter') }, [h(Icon, { name: 'alignCenterH', size: 15 })]),
            h('button', { class: 'ghost icon', title: '右对齐', onClick: () => store.align('right') }, [h(Icon, { name: 'alignRight', size: 15 })]),
            h('button', { class: 'ghost icon', title: '顶对齐', onClick: () => store.align('top') }, [h(Icon, { name: 'alignTop', size: 15 })]),
            h('button', { class: 'ghost icon', title: '垂直居中', onClick: () => store.align('vcenter') }, [h(Icon, { name: 'alignCenterV', size: 15 })]),
            h('button', { class: 'ghost icon', title: '底对齐', onClick: () => store.align('bottom') }, [h(Icon, { name: 'alignBottom', size: 15 })]),
          ]),
          h('div', { class: 'grid2', style: 'margin-top:5px' }, [
            h('button', { onClick: () => store.distribute('horizontal') }, [h(Icon, { name: 'distH', size: 13 }), '水平等距']),
            h('button', { onClick: () => store.distribute('vertical') }, [h(Icon, { name: 'distV', size: 13 }), '垂直等距']),
          ]),
        ]),
        h('div', { style: 'margin-top:8px;display:flex;gap:6px;flex-wrap:wrap' }, [
          h('button', { onClick: () => store.unionInPlace() }, '合并重叠区域'),
          h('button', { onClick: () => store.mergeLines() }, '合并流水线'),
          h('button', { class: 'danger', onClick: () => store.deleteSelected() }, '删除'),
        ]),
      ]);
    };

    const versionModal = () =>
      h('div', { class: 'modal-backdrop', onClick: (e: MouseEvent) => e.target === e.currentTarget && (showVersions.value = false) }, [
        h('div', { class: 'modal' }, [
          h('div', { class: 'modal-header' }, [
            h('span', null, '版本历史'),
            h('button', { class: 'ghost icon', onClick: () => (showVersions.value = false) }, [h(Icon, { name: 'close', size: 15 })]),
          ]),
          h('div', { class: 'modal-body' }, [
            versions.value.length === 0
              ? h('div', { class: 'empty' }, '还没有发布版本。保存时选择「保存并发布版本」即可留档，便于追溯每次报批与施工交底。')
              : h('table', { class: 'table' }, [
                  h('thead', null, [h('tr', null, [h('th', null, '版本'), h('th', null, '说明'), h('th', null, '发布人'), h('th', null, '时间'), h('th')])]),
                  h('tbody', null, versions.value.map((v) =>
                    h('tr', { key: v.id }, [
                      h('td', { class: 'mono' }, v.name),
                      h('td', null, v.note || '—'),
                      h('td', null, v.author || '—'),
                      h('td', { class: 'mono' }, formatDate(v.createdAt)),
                      h('td', null, [
                        h('button', { onClick: () => { restoreVersion(v.id); showVersions.value = false; } }, '恢复此版本'),
                      ]),
                    ])
                  )),
                ]),
          ]),
        ]),
      ]);

    const doExportPngPreview = () => {
      const canvas = document.querySelector<HTMLCanvasElement>('.canvas-wrap canvas.gpu-layer');
      const overlay = document.querySelector<HTMLCanvasElement>('.canvas-wrap canvas.overlay-layer');
      if (!canvas) return;
      const out = document.createElement('canvas');
      out.width = canvas.width;
      out.height = canvas.height;
      const ctx = out.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(canvas, 0, 0);
      if (overlay) ctx.drawImage(overlay, 0, 0);
      out.toBlob((blob) => {
        if (blob) downloadBlob(`${store.doc.value.name || '标线方案'}.png`, blob);
      }, 'image/png');
    };

    return () =>
      h('div', { class: 'editor-view', style: 'height:100%;display:flex;flex-direction:column' }, [
        h('div', { class: 'editor-toolbar' }, [
          h('div', { style: 'display:flex;align-items:center;gap:6px;min-width:0' }, [
            h(RouterLink, { to: '/plans', class: 'ghost icon', style: 'display:inline-flex;padding:5px;border-radius:6px' }, [h(Icon, { name: 'back', size: 16 })]),
            h('input', {
              type: 'text',
              value: store.doc.value.name,
              style: 'font-weight:600;width:190px',
              onInput: (e: Event) => store.setDocMeta({ name: (e.target as HTMLInputElement).value }),
            }),
            store.docDirty.value ? h('span', { class: 'pill warn' }, '未保存') : h('span', { class: 'pill ok' }, '已保存'),
            store.history.canUndo
              ? h('span', { class: 'hint', title: '可撤销步数' }, `可撤销 ${store.history.depth} 步`)
              : null,
          ]),
          h('div', { class: 'spacer', style: 'flex:1' }),
          h('div', { style: 'display:flex;gap:5px;align-items:center;flex-wrap:wrap' }, [
            h('button', { onClick: () => store.undo(), disabled: !store.history.canUndo, title: '撤销 Ctrl+Z' }, [h(Icon, { name: 'undo', size: 14 })]),
            h('button', { onClick: () => store.redo(), disabled: !store.history.canRedo, title: '重做 Ctrl+Shift+Z' }, [h(Icon, { name: 'redo', size: 14 })]),
            h('button', { class: ['panel-toggle', { active: showLeft.value }], title: '显示/隐藏图元库', onClick: () => (showLeft.value = !showLeft.value) }, [h(Icon, { name: 'layers', size: 14 }), '图元']),
            h('button', { class: ['panel-toggle', { active: showRight.value }], title: '显示/隐藏属性面板', onClick: () => (showRight.value = !showRight.value) }, [h(Icon, { name: 'settings', size: 14 }), '属性']),
            h('span', { style: 'width:1px;height:18px;background:var(--border)' }),
            h('button', { onClick: () => store.booleanOp('union'), disabled: store.selection.value.length < 2, title: '并集 (Ctrl+G 为原位合并)' }, [h(Icon, { name: 'union', size: 14 }), '并集']),
            h('button', { onClick: () => store.booleanOp('difference'), disabled: store.selection.value.length < 2, title: '差集' }, [h(Icon, { name: 'subtract', size: 14 }), '差集']),
            h('button', { onClick: () => store.mergeLines(), disabled: store.selection.value.length < 1, title: '合并相交/相接的中心线为流水线 (Ctrl+J)' }, [h(Icon, { name: 'merge', size: 14 }), '合并流水线']),
            h('span', { style: 'width:1px;height:18px;background:var(--border)' }),
            h('button', { onClick: () => store.align('left'), disabled: store.selection.value.length < 2, title: '左对齐' }, [h(Icon, { name: 'alignLeft', size: 14 })]),
            h('button', { onClick: () => store.align('hcenter'), disabled: store.selection.value.length < 2, title: '水平居中' }, [h(Icon, { name: 'alignCenterH', size: 14 })]),
            h('button', { onClick: () => store.align('right'), disabled: store.selection.value.length < 2, title: '右对齐' }, [h(Icon, { name: 'alignRight', size: 14 })]),
            h('button', { onClick: () => store.align('top'), disabled: store.selection.value.length < 2, title: '顶对齐' }, [h(Icon, { name: 'alignTop', size: 14 })]),
            h('button', { onClick: () => store.align('vcenter'), disabled: store.selection.value.length < 2, title: '垂直居中' }, [h(Icon, { name: 'alignCenterV', size: 14 })]),
            h('button', { onClick: () => store.align('bottom'), disabled: store.selection.value.length < 2, title: '底对齐' }, [h(Icon, { name: 'alignBottom', size: 14 })]),
            h('button', { onClick: () => store.distribute('horizontal'), disabled: store.selection.value.length < 3, title: '水平等距' }, [h(Icon, { name: 'distH', size: 14 })]),
            h('button', { onClick: () => store.distribute('vertical'), disabled: store.selection.value.length < 3, title: '垂直等距' }, [h(Icon, { name: 'distV', size: 14 })]),
            h('span', { style: 'width:1px;height:18px;background:var(--border)' }),
            h('button', { class: 'ghost', onClick: () => document.getElementById('bg-upload')?.click(), title: '上传厂房底图' }, [h(Icon, { name: 'upload', size: 14 }), bgLoading.value ? '上传中…' : '底图']),
            h('input', { id: 'bg-upload', type: 'file', accept: 'image/*', style: 'display:none', onChange: uploadBackground }),
            store.doc.value.background
              ? h('button', { class: store.calibration.value ? 'active' : '', onClick: () => (showCalibrate.value = true), title: '用已知长度校准底图比例' }, [h(Icon, { name: 'ruler', size: 14 }), '校准'])
              : null,
            h(
              'div',
              { style: 'position:relative' },
              [
                h('button', { onClick: () => (showExport.value = !showExport.value), title: '导出' }, [h(Icon, { name: 'export', size: 14 }), '导出']),
                showExport.value
                  ? h('div', { class: 'dropdown' }, [
                      h('button', { onClick: () => { showExport.value = false; doExportSvg(); } }, '导出 SVG（施工 1:1）'),
                      h('button', { onClick: () => { showExport.value = false; doExportGeo(); } }, '导出 GeoJSON（GIS）'),
                      h('button', { onClick: () => { showExport.value = false; doExportList(); } }, '导出工程量清单 CSV'),
                      h('button', { onClick: () => { showExport.value = false; doExportPngPreview(); } }, '导出 PNG 预览图'),
                    ])
                  : null,
              ]
            ),
            h('button', { onClick: () => (showVersions.value = true) }, [h(Icon, { name: 'history', size: 14 }), `版本 ${versions.value.length}`]),
            h('button', { class: 'primary', onClick: openSave }, [h(Icon, { name: 'save', size: 14 }), '保存']),
          ]),
        ]),
        h('div', { class: ['workspace', { 'show-left': showLeft.value, 'show-right': showRight.value }] }, [
          toolRail(),
          libraryPanel(),
          h('div', { class: 'canvas-host' }, [h(PlanCanvas)]),
          h('div', { class: ['panel-right', { shown: showRight.value }] }, [
            h('div', { class: 'tabbar' }, [
              h('button', { class: rightTab.value === 'props' ? 'active' : '', onClick: () => (rightTab.value = 'props') }, '属性'),
              h('button', { class: rightTab.value === 'layers' ? 'active' : '', onClick: () => (rightTab.value = 'layers') }, '图层'),
            ]),
            h('div', { style: 'flex:1;min-height:0;display:flex' }, [rightTab.value === 'props' ? propsPanel() : layersList()]),
          ]),
        ]),
        // Save dialog
        showSave.value
          ? h('div', { class: 'modal-backdrop', onClick: (e: MouseEvent) => e.target === e.currentTarget && (showSave.value = false) }, [
              h('div', { class: 'modal', style: 'width:min(420px,92vw)' }, [
                h('div', { class: 'modal-header' }, [h('span', null, '保存方案'), h('button', { class: 'ghost icon', onClick: () => (showSave.value = false) }, [h(Icon, { name: 'close', size: 15 })])]),
                h('div', { class: 'modal-body' }, [
                  h('div', { class: 'row' }, [
                    h('label', null, '方案名'),
                    h('input', { type: 'text', value: saveName.value, onInput: (e: Event) => (saveName.value = (e.target as HTMLInputElement).value) }),
                  ]),
                  h('div', { class: 'row' }, [
                    h('label', null, '版本说明'),
                    h('input', { type: 'text', value: saveNote.value, placeholder: '例如：调整 3 号通道宽度', onInput: (e: Event) => (saveNote.value = (e.target as HTMLInputElement).value) }),
                  ]),
                  h('div', { class: 'hint' }, '「保存」覆盖当前方案；「保存并发布版本」会创建一份不可变的版本快照，供施工方与培训使用。'),
                ]),
                h('div', { class: 'modal-footer' }, [
                  h('button', { onClick: () => save(false), disabled: saving.value }, '保存'),
                  h('button', { class: 'primary', onClick: () => save(true), disabled: saving.value }, [h(Icon, { name: 'history', size: 14 }), '保存并发布版本']),
                ]),
              ]),
            ])
          : null,
        showVersions.value ? versionModal() : null,
        showCalibrate.value ? calibrateModal() : null,
        store.calibration.value ? calibrationHud() : null,
      ]);

    function calibrateModal() {
      return h('div', { class: 'modal-backdrop', onClick: (e: MouseEvent) => e.target === e.currentTarget && (showCalibrate.value = false) }, [
        h('div', { class: 'modal', style: 'width:min(480px,92vw)' }, [
          h('div', { class: 'modal-header' }, [
            h('span', null, '校准底图比例'),
            h('button', { class: 'ghost icon', onClick: () => (showCalibrate.value = false) }, [h(Icon, { name: 'close', size: 15 })]),
          ]),
          h('div', { class: 'modal-body' }, [
            h('div', { class: 'hint', style: 'line-height:1.8;margin-bottom:12px' }, [
              h('div', null, '1. 在底图上点击一段已知长度的起点（如柱子中心、门洞一侧）。'),
              h('div', null, '2. 再点击该长度的终点。'),
              h('div', null, '3. 输入这段距离的实际米数，系统按比例缩放底图，之后绘制的标线就是真实尺寸。'),
            ]),
            h('div', { class: 'row' }, [
              h('label', null, '实际长度'),
              h('input', { type: 'number', step: 0.1, min: 0.5, value: calibMetres.value, onInput: (e: Event) => (calibMetres.value = Number((e.target as HTMLInputElement).value)) }),
              h('span', { class: 'hint' }, 'm'),
            ]),
            store.calibration.value?.p1 && store.calibration.value?.p2
              ? h('div', { class: 'pill ok', style: 'margin-top:6px' }, `已选两点，图上距离 ${(Math.hypot(store.calibration.value.p2.x - store.calibration.value.p1.x, store.calibration.value.p2.y - store.calibration.value.p1.y) / 1000).toFixed(2)} m`)
              : h('div', { class: 'hint', style: 'margin-top:6px' }, '尚未选择两点。点击「开始标定」后在图上依次点击两点。'),
          ]),
          h('div', { class: 'modal-footer' }, [
            store.calibration.value
              ? h('button', { onClick: () => { store.cancelCalibration(); showCalibrate.value = false; } }, '取消标定')
              : h('button', { onClick: () => { showCalibrate.value = false; store.startCalibration(); } , class: 'primary' }, '开始标定'),
            h('button', {
              class: 'primary',
              disabled: !(store.calibration.value?.p1 && store.calibration.value?.p2),
              onClick: () => {
                const c = store.calibration.value!;
                store.calibrateBackground(c.p1!, c.p2!, calibMetres.value);
                store.cancelCalibration();
                showCalibrate.value = false;
                store.zoomToFitDoc();
                store.toast('底图比例已校准', 'success');
              },
            }, '应用校准'),
          ]),
        ]),
      ]);
    }

    function calibrationHud() {
      const c = store.calibration.value!;
      return h('div', { class: 'calib-hud' }, [
        h(Icon, { name: 'ruler', size: 14 }),
        h('span', null, c.step === 1 ? '标定：点击起点' : c.p2 ? '两点已选，返回对话框应用' : '标定：点击终点'),
        h('button', { class: 'ghost', onClick: () => store.cancelCalibration() }, '取消'),
      ]);
    }
  },
});

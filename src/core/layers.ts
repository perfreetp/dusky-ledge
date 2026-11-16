/**
 * 地层定义：自上而下编号，第 1 层为最上层（表土/耕土）。
 * Y 轴向上，y = 0 是探方底面。层厚以“行”为单位（体素行），
 * 层与层之间严格连续覆盖 Y 轴，不重叠、不留空隙。
 */
export interface LayerSpec {
  /** 0-based 索引，界面上显示为“第 index+1 层” */
  index: number;
  /** 该层最低的体素行（含） */
  start: number;
  /** 层厚（体素行数） */
  rows: number;
}

export interface Dims {
  nx: number;
  ny: number;
  nz: number;
}

export function buildLayers(rowsTopDown: readonly number[]): LayerSpec[] {
  let cursor = rowsTopDown.reduce((a, b) => a + b, 0);
  return rowsTopDown.map((rows, index) => {
    if (!Number.isFinite(rows) || rows < 1) throw new Error('层厚至少为 1 行');
    cursor -= rows;
    return { index, start: cursor, rows };
  });
}

export function totalRows(rows: readonly number[]): number {
  return rows.reduce((a, b) => a + b, 0);
}

/** 返回 y 所在层的索引；越界返回 -1。 */
export function layerAtY(layers: readonly LayerSpec[], y: number): number {
  for (const layer of layers) {
    if (y >= layer.start && y < layer.start + layer.rows) return layer.index;
  }
  return -1;
}

export function layerRange(layers: readonly LayerSpec[], index: number): { start: number; end: number } | null {
  const l = layers[index];
  if (!l) return null;
  return { start: l.start, end: l.start + l.rows };
}

export function layerLabel(index: number): string {
  return `第 ${index + 1} 层`;
}

/** 层号的中文序数，用于紧凑标签。 */
export function layerShort(index: number): string {
  const numerals = '一二三四五六七八九十';
  return `L${index + 1}${index < numerals.length ? ` ${numerals[index]}` : ''}`;
}

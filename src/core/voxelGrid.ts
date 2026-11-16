import type { Dims, LayerSpec } from './layers';

/** 体素网格：mat 保存材质 id（0 为空），hidden 保存单独隐藏标记。 */
export class VoxelGrid {
  readonly dims: Dims;
  readonly mat: Uint8Array;
  readonly hidden: Uint8Array;
  /**
   * 变更日志：记录自上次 clearJournal() 以来被改动过的体素索引。
   * 增量网格化据此只需重算受影响的块。
   * 直接改写 mat/hidden 数组的批量操作需自行调用 touchAll()。
   */
  private journal = new Set<number>();
  private journalOverflow = false;

  constructor(dims: Dims, mat?: Uint8Array, hidden?: Uint8Array) {
    if (dims.nx <= 0 || dims.ny <= 0 || dims.nz <= 0) throw new Error('网格尺寸非法');
    this.dims = { ...dims };
    const n = dims.nx * dims.ny * dims.nz;
    this.mat = mat ?? new Uint8Array(n);
    this.hidden = hidden ?? new Uint8Array(n);
    if (this.mat.length !== n || this.hidden.length !== n) throw new Error('体素数据长度与尺寸不符');
  }

  get length(): number {
    return this.mat.length;
  }

  index(x: number, y: number, z: number): number {
    return (y * this.dims.nz + z) * this.dims.nx + x;
  }

  coords(index: number): { x: number; y: number; z: number } {
    const x = index % this.dims.nx;
    const rest = (index - x) / this.dims.nx;
    const z = rest % this.dims.nz;
    const y = (rest - z) / this.dims.nz;
    return { x, y, z };
  }

  inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && y >= 0 && z >= 0 && x < this.dims.nx && y < this.dims.ny && z < this.dims.nz;
  }

  materialAt(x: number, y: number, z: number): number {
    if (!this.inBounds(x, y, z)) return 0;
    return this.mat[this.index(x, y, z)];
  }

  setMaterial(x: number, y: number, z: number, material: number): boolean {
    if (!this.inBounds(x, y, z)) return false;
    const i = this.index(x, y, z);
    const next = material > 0 ? material : 0;
    const changed = this.mat[i] !== next || (next === 0 && this.hidden[i] !== 0);
    this.mat[i] = next;
    if (next === 0) this.hidden[i] = 0;
    if (changed) this.journal.add(i);
    return changed;
  }

  isHidden(x: number, y: number, z: number): boolean {
    if (!this.inBounds(x, y, z)) return false;
    return this.hidden[this.index(x, y, z)] !== 0;
  }

  setHidden(x: number, y: number, z: number, hidden: boolean): boolean {
    if (!this.inBounds(x, y, z)) return false;
    const i = this.index(x, y, z);
    if (this.mat[i] === 0) return false;
    const next = hidden ? 1 : 0;
    if (this.hidden[i] === next) return false;
    this.hidden[i] = next;
    this.journal.add(i);
    return true;
  }

  /** 直接批量改写 mat/hidden 后调用，声明“全部需要重算” */
  touchAll(): void {
    this.journalOverflow = true;
  }

  touchIndex(i: number): void {
    this.journal.add(i);
  }

  /** 取出并清空变更日志；overflow=true 表示需整体重算 */
  drainJournal(): { indices: number[]; overflow: boolean } {
    const out = { indices: [...this.journal], overflow: this.journalOverflow };
    this.journal.clear();
    this.journalOverflow = false;
    return out;
  }

  peekJournalSize(): number {
    return this.journalOverflow ? Infinity : this.journal.size;
  }

  mirrorX(x: number): number {
    return this.dims.nx - 1 - x;
  }

  clone(): VoxelGrid {
    return new VoxelGrid(this.dims, this.mat.slice(), this.hidden.slice());
  }

  replaceWith(other: VoxelGrid): void {
    if (this.mat.length !== other.mat.length) throw new Error('网格尺寸不一致');
    this.mat.set(other.mat);
    this.hidden.set(other.hidden);
    this.touchAll();
  }

  clear(): void {
    this.mat.fill(0);
    this.hidden.fill(0);
    this.touchAll();
  }

  filled(): number {
    let n = 0;
    for (let i = 0; i < this.mat.length; i++) if (this.mat[i] !== 0) n++;
    return n;
  }

  countsByMaterial(): Uint32Array {
    const counts = new Uint32Array(10);
    for (let i = 0; i < this.mat.length; i++) counts[this.mat[i]]++;
    return counts;
  }

  countsByLayer(layers: readonly LayerSpec[]): Uint32Array {
    const counts = new Uint32Array(layers.length);
    const nxz = this.dims.nx * this.dims.nz;
    for (const layer of layers) {
      let c = 0;
      for (let y = layer.start; y < layer.start + layer.rows; y++) {
        const base = y * nxz;
        for (let k = 0; k < nxz; k++) if (this.mat[base + k] !== 0) c++;
      }
      counts[layer.index] = c;
    }
    return counts;
  }

  layerVolume(index: number, layers: readonly LayerSpec[]): number {
    const layer = layers[index];
    if (!layer) return 0;
    let c = 0;
    const nxz = this.dims.nx * this.dims.nz;
    for (let y = layer.start; y < layer.start + layer.rows; y++) {
      const base = y * nxz;
      for (let k = 0; k < nxz; k++) if (this.mat[base + k] !== 0) c++;
    }
    return c;
  }

  serialize(): { dims: Dims; mat: string; hidden: string } {
    return {
      dims: { ...this.dims },
      mat: encodeRle(this.mat),
      hidden: encodeRle(this.hidden),
    };
  }

  static deserialize(data: { dims: Dims; mat: string; hidden?: string }): VoxelGrid {
    const n = data.dims.nx * data.dims.ny * data.dims.nz;
    const mat = decodeRle(data.mat, n);
    const hidden = data.hidden ? decodeRle(data.hidden, n) : new Uint8Array(n);
    return new VoxelGrid(data.dims, mat, hidden);
  }
}

/** 镜像一致性：左右对称格子的材质相同视为一致。 */
export function mirrorConsistency(grid: VoxelGrid): { matched: number; total: number; ratio: number } {
  const { nx, ny, nz } = grid.dims;
  if (nx < 2) return { matched: 0, total: 0, ratio: 1 };
  let matched = 0;
  let total = 0;
  const half = Math.floor(nx / 2);
  const nxz = nx * nz;
  for (let y = 0; y < ny; y++) {
    for (let z = 0; z < nz; z++) {
      for (let x = 0; x < half; x++) {
        const a = y * nxz + z * nx + x;
        const b = y * nxz + z * nx + (nx - 1 - x);
        total++;
        if (grid.mat[a] === grid.mat[b]) matched++;
      }
    }
  }
  // 奇数宽度时中轴自身无需比较
  return { matched, total, ratio: total ? matched / total : 1 };
}

// ── RLE + base64（提交数据压缩，localStorage 友好） ──

export function encodeRle(bytes: Uint8Array): string {
  const out: number[] = [];
  let i = 0;
  while (i < bytes.length) {
    const v = bytes[i];
    let run = 1;
    while (i + run < bytes.length && bytes[i + run] === v && run < 0xffffffff) run++;
    out.push(v);
    let n = run;
    do {
      let b = n & 0x7f;
      n >>>= 7;
      if (n) b |= 0x80;
      out.push(b);
    } while (n);
    i += run;
  }
  return bytesToBase64(Uint8Array.from(out));
}

export function decodeRle(text: string, expected: number): Uint8Array {
  const raw = base64ToBytes(text);
  const out = new Uint8Array(expected);
  let p = 0;
  let w = 0;
  while (p < raw.length) {
    const v = raw[p++];
    let count = 0;
    let shift = 0;
    let b = 0;
    do {
      b = raw[p++];
      count |= (b & 0x7f) << shift;
      shift += 7;
    } while (b & 0x80);
    const end = Math.min(expected, w + count);
    if (v !== 0) out.fill(v, w, end);
    w = end;
    if (w >= expected) break;
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(text: string): Uint8Array {
  const binary = atob(text);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

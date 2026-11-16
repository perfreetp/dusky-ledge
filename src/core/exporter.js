// 序列帧导出:逐帧渲染 -> PNG -> 打包 ZIP(STORE 方式)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function strToBytes(s) {
  return new TextEncoder().encode(s);
}

// files: [{name, data:Uint8Array}]
export function buildZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const push = (arr) => { chunks.push(arr); offset += arr.length; };
  const u16 = (v) => new Uint8Array([v & 255, (v >> 8) & 255]);
  const u32 = (v) => new Uint8Array([v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]);

  for (const f of files) {
    const name = strToBytes(f.name);
    const crc = crc32(f.data);
    const local = [
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(f.data.length), u32(f.data.length),
      u16(name.length), u16(0), name,
    ];
    for (const c of local) push(c);
    push(f.data);
    central.push({ name, crc, size: f.data.length, offset: offset - f.data.length - 30 - name.length });
  }
  const cdStart = offset;
  for (const e of central) {
    const parts = [
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(e.crc), u32(e.size), u32(e.size),
      u16(e.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(e.offset), e.name,
    ];
    for (const c of parts) push(c);
  }
  const cdSize = offset - cdStart;
  for (const c of [u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(cdSize), u32(cdStart), u16(0)])
    push(c);

  const out = new Uint8Array(offset);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

export function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.split(',')[1];
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function downloadBlob(data, filename, type = 'application/zip') {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// 逐帧渲染并打包。renderFrame(f) 负责把场景摆到第 f 帧并绘制。
export async function exportSequence(anim, renderFrame, canvas, onProgress) {
  const files = [];
  const [ls, le] = anim.loop;
  const pad = (n) => String(n).padStart(4, '0');
  for (let f = ls; f <= le; f++) {
    renderFrame(f);
    const bytes = dataUrlToBytes(canvas.toDataURL('image/png'));
    files.push({ name: `${anim.name}_${pad(f)}.png`, data: bytes });
    if (onProgress) onProgress(f - ls + 1, le - ls + 1);
    await new Promise((r) => setTimeout(r, 0)); // 让出主线程刷新进度
  }
  const meta = {
    name: anim.name,
    fps: anim.fps,
    totalFrames: anim.frames,
    loop: anim.loop,
    exportedFrames: le - ls + 1,
    exportedAt: new Date().toISOString(),
  };
  files.push({ name: 'meta.json', data: strToBytes(JSON.stringify(meta, null, 2)) });
  return buildZip(files);
}

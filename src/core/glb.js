// 最小 GLB(glTF 2.0 二进制)写出器:单 mesh、顶点色

export function buildGLB(geo) {
  const { positions, normals, colors, indices } = geo

  // 对齐到 4 字节
  const pad4 = (n) => (n + 3) & ~3
  const posBuf = positions.buffer.slice(positions.byteOffset, positions.byteOffset + positions.byteLength)
  const nrmBuf = normals.buffer.slice(normals.byteOffset, normals.byteOffset + normals.byteLength)
  const colBuf = colors.buffer.slice(colors.byteOffset, colors.byteOffset + colors.byteLength)
  const idxBuf = indices.buffer.slice(indices.byteOffset, indices.byteOffset + indices.byteLength)

  const idxComponent = indices instanceof Uint32Array ? 5125 : 5123
  const idxBytes = idxBuf.byteLength

  const views = []
  const chunks = []
  let offset = 0
  const pushView = (buf, target) => {
    const start = offset
    chunks.push({ start, buf })
    offset += pad4(buf.byteLength)
    views.push({ buffer: 0, byteOffset: start, byteLength: buf.byteLength, target })
    return views.length - 1
  }
  const vPos = pushView(posBuf, 34962)
  const vNrm = pushView(nrmBuf, 34962)
  const vCol = pushView(colBuf, 34962)
  const vIdx = pushView(idxBuf, 34963)

  // POSITION 需要 min/max
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const val = positions[i + k]
      if (val < min[k]) min[k] = val
      if (val > max[k]) max[k] = val
    }
  }

  const json = {
    asset: { version: '2.0', generator: 'taihu-voxel-studio' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'taihu-stone' }],
    meshes: [{
      name: 'taihu-stone',
      primitives: [{
        attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 },
        indices: 3,
        material: 0
      }]
    }],
    materials: [{
      name: 'stone',
      pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.9 }
    }],
    accessors: [
      { bufferView: vPos, componentType: 5126, count: positions.length / 3, type: 'VEC3', min, max },
      { bufferView: vNrm, componentType: 5126, count: normals.length / 3, type: 'VEC3' },
      { bufferView: vCol, componentType: 5126, count: colors.length / 3, type: 'VEC3' },
      { bufferView: vIdx, componentType: idxComponent, count: indices.length, type: 'SCALAR' }
    ],
    bufferViews: views,
    buffers: [{ byteLength: offset }]
  }

  let jsonStr = JSON.stringify(json)
  while (jsonStr.length % 4 !== 0) jsonStr += ' '
  const jsonBytes = new TextEncoder().encode(jsonStr)

  const binLen = offset
  const total =
    12 + // GLB 头
    8 + jsonBytes.length + // JSON chunk
    8 + binLen // BIN chunk

  const out = new ArrayBuffer(total)
  const dv = new DataView(out)
  const u8 = new Uint8Array(out)
  let p = 0
  dv.setUint32(p, 0x46546c67, true); p += 4 // magic 'glTF'
  dv.setUint32(p, 2, true); p += 4 // version
  dv.setUint32(p, total, true); p += 4 // total length
  dv.setUint32(p, jsonBytes.length, true); p += 4
  dv.setUint32(p, 0x4e4f534a, true); p += 4 // 'JSON'
  u8.set(jsonBytes, p); p += jsonBytes.length
  dv.setUint32(p, binLen, true); p += 4
  dv.setUint32(p, 0x004e4942, true); p += 4 // 'BIN\0'
  for (const c of chunks) {
    u8.set(new Uint8Array(c.buf), p + c.start)
  }
  return out
}

export function downloadBlob(data, filename, type = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

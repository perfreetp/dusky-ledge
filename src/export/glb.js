import { buildMesh, modelStats } from '../voxel/mesh.js'
import { GROUPS } from '../store/materials.js'
import { hexToLinearRgba } from '../render/math.js'

const align4 = (n) => (n + 3) & ~3

/** 导出用的紧凑网格：位置/法线/索引分开，各按 4 字节对齐 */
function packGroup(mesh) {
  const n = mesh.vertexCount
  const pos = new Float32Array(n * 3)
  const nrm = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    pos[i * 3] = mesh.positions[i * 3]
    pos[i * 3 + 1] = mesh.positions[i * 3 + 1]
    pos[i * 3 + 2] = mesh.positions[i * 3 + 2]
    nrm[i * 3] = mesh.normals[i * 3]
    nrm[i * 3 + 1] = mesh.normals[i * 3 + 1]
    nrm[i * 3 + 2] = mesh.normals[i * 3 + 2]
  }
  const idx = new Uint32Array(mesh.indices)
  return { pos, nrm, idx, count: n, triCount: mesh.triCount }
}

export function buildGLB(model, opts = {}) {
  const groups = opts.groups ?? GROUPS.map((g) => g.id)
  const visible = new Set(groups)
  const clip = opts.clip ?? null

  // 一次合并四组：组与组之间的相邻面也会被剔掉，拆组导出不重复计面
  const merged = buildMesh(model, { visibleGroups: visible, clip })

  const parts = []
  let cursor = 0
  const push = (arr) => {
    const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)
    const off = cursor
    parts.push(bytes)
    cursor += bytes.byteLength
    const pad = align4(cursor) - cursor
    if (pad) {
      parts.push(new Uint8Array(pad))
      cursor += pad
    }
    return off
  }

  const bufferViews = []
  const accessors = []
  const materials = []
  const nodes = []
  const meshes = []
  const triByGroup = [0, 0, 0, 0]
  let triTotal = 0

  for (const g of GROUPS) {
    if (!visible.has(g.id)) continue
    const gb = merged.groupBuffers[g.id]
    const count = gb.pos.length / 3
    if (!count || !gb.idx.length) continue
    const pos = new Float32Array(gb.pos)
    const nrm = new Float32Array(gb.nrm)
    const idx = new Uint32Array(gb.idx)
    const tri = idx.length / 3
    triByGroup[g.id] = tri
    triTotal += tri

    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    for (let i = 0; i < count; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2]
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (z < minZ) minZ = z
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      if (z > maxZ) maxZ = z
    }

    bufferViews.push({ buffer: 0, byteOffset: push(pos), byteLength: pos.byteLength, target: 34962 })
    const posView = bufferViews.length - 1
    accessors.push({
      bufferView: posView,
      componentType: 5126,
      count,
      type: 'VEC3',
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    })
    const posAcc = accessors.length - 1

    bufferViews.push({ buffer: 0, byteOffset: push(nrm), byteLength: nrm.byteLength, target: 34962 })
    const nrmView = bufferViews.length - 1
    accessors.push({ bufferView: nrmView, componentType: 5126, count, type: 'VEC3' })
    const nrmAcc = accessors.length - 1

    bufferViews.push({ buffer: 0, byteOffset: push(idx), byteLength: idx.byteLength, target: 34963 })
    const idxView = bufferViews.length - 1
    accessors.push({ bufferView: idxView, componentType: 5125, count: idx.length, type: 'SCALAR' })
    const idxAcc = accessors.length - 1

    const base = hexToLinearRgba(g.color)
    materials.push({
      name: g.name,
      pbrMetallicRoughness: {
        baseColorFactor: [base[0], base[1], base[2], 1],
        metallicFactor: 0.25,
        roughnessFactor: 0.55,
      },
    })
    const matIdx = materials.length - 1
    meshes.push({
      name: `${g.en}_${g.name}`,
      primitives: [{ attributes: { POSITION: posAcc, NORMAL: nrmAcc }, indices: idxAcc, material: matIdx }],
    })
    nodes.push({ name: `${g.en}_${g.name}`, mesh: meshes.length - 1 })
  }

  if (!nodes.length) throw new Error('模型为空，没有可导出的面。')
  const bin = concatParts(parts)
  const gltf = {
    asset: { version: '2.0', generator: '剖面工坊 · 教具体素建模' },
    scene: 0,
    scenes: [{ name: opts.name || '设备剖面教具', nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.byteLength }],
  }
  return { glb: encodeGLB(gltf, bin), triTotal, triByGroup, groupNames: materials.map((m) => m.name) }
}

function concatParts(parts) {
  let total = 0
  for (const p of parts) total += p.byteLength
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.byteLength
  }
  return out
}

function encodeGLB(gltf, bin) {
  const enc = new TextEncoder()
  let jsonBytes = enc.encode(JSON.stringify(gltf))
  const jsonPad = align4(jsonBytes.byteLength) - jsonBytes.byteLength
  if (jsonPad) {
    const padded = new Uint8Array(jsonBytes.byteLength + jsonPad)
    padded.set(jsonBytes)
    padded.fill(0x20, jsonBytes.byteLength)
    jsonBytes = padded
  }
  const binPad = align4(bin.byteLength) - bin.byteLength
  const binLen = bin.byteLength + binPad
  const total = 12 + 8 + jsonBytes.byteLength + 8 + binLen
  const buf = new ArrayBuffer(total)
  const dv = new DataView(buf)
  const u8 = new Uint8Array(buf)
  dv.setUint32(0, 0x46546c67, true)
  dv.setUint32(4, 2, true)
  dv.setUint32(8, total, true)
  dv.setUint32(12, jsonBytes.byteLength, true)
  dv.setUint32(16, 0x4e4f534a, true)
  u8.set(jsonBytes, 20)
  const binStart = 20 + jsonBytes.byteLength
  dv.setUint32(binStart, binLen, true)
  dv.setUint32(binStart + 4, 0x004e4942, true)
  u8.set(bin, binStart + 8)
  return new Uint8Array(buf)
}

export function downloadGLB(model, filename, opts = {}) {
  const { glb, triTotal } = buildGLB(model, opts)
  const blob = new Blob([glb], { type: 'model/gltf-binary' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename.endsWith('.glb') ? filename : filename + '.glb'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  return { bytes: glb.byteLength, triTotal }
}

/** 导出前的核对数据：体素数 / 面数 / 各组占比 */
export function exportReport(model, opts = {}) {
  const stats = modelStats(model)
  const clip = opts.clip ?? null
  const visible = new Set(opts.groups ?? GROUPS.map((g) => g.id))
  const preview = buildMesh(model, { visibleGroups: visible, clip })
  return {
    voxels: stats.count,
    voxelsByGroup: stats.byGroup,
    matCounts: stats.byMat,
    bounds: stats.bounds,
    previewTri: preview.triCount,
    mergedTri: preview.triCount,
    quadCount: preview.quadCount,
    rawFaceCount: preview.rawFaceCount,
    rawFaceByGroup: preview.rawFaceByGroup,
    triByGroup: preview.triByGroup,
    exportedGroups: [...visible],
  }
}

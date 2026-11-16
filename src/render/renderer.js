import {
  mat4Perspective,
  mat4LookAt,
  mat4Mul,
  mat4Invert,
  v3,
  transformPoint,
} from './math.js'
import { WGSL_SHADOW, WGSL_FORWARD, WGSL_SSAO, WGSL_COMPOSITE, WGSL_OVERLAY } from './shaders.js'
import { sortTransparent } from '../voxel/mesh.js'

const SHADOW_SIZE = 2048

export class OrbitCamera {
  constructor() {
    this.target = [0, 1.2, 0]
    this.yaw = -0.72
    this.pitch = 0.36
    this.distance = 11
    this.fov = (38 * Math.PI) / 180
    this.near = 0.05
    this.far = 220
    this.eye = [0, 0, 0]
  }

  update() {
    const cp = Math.cos(this.pitch)
    this.eye = [
      this.target[0] + Math.sin(this.yaw) * cp * this.distance,
      this.target[1] + Math.sin(this.pitch) * this.distance,
      this.target[2] + Math.cos(this.yaw) * cp * this.distance,
    ]
  }

  viewProj(aspect) {
    this.update()
    const v = mat4LookAt(this.eye, this.target, [0, 1, 0])
    const p = mat4Perspective(this.fov, aspect, this.near, this.far)
    return { viewProj: mat4Mul(p, v), view: v, proj: p }
  }

  orbit(dx, dy) {
    this.yaw -= dx * 0.0075
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + dy * 0.0075))
  }

  pan(dx, dy, viewportH) {
    this.update()
    const fwd = v3.norm(v3.sub(this.target, this.eye))
    const right = v3.norm(v3.cross(fwd, [0, 1, 0]))
    const up = v3.cross(right, fwd)
    const k = (2 * Math.tan(this.fov / 2) * this.distance) / Math.max(1, viewportH)
    this.target = v3.add(this.target, v3.add(v3.scale(right, -dx * k), v3.scale(up, dy * k)))
  }

  zoom(delta) {
    this.distance = Math.max(1.2, Math.min(90, this.distance * Math.exp(delta * 0.0012)))
  }

  frame(bounds, aspect, dims) {
    if (!bounds) return
    const ox = dims ? -dims.x / 2 : 0
    const oz = dims ? -dims.z / 2 : 0
    const sx = (bounds.max[0] - bounds.min[0] + 1) * 0.5
    const sy = (bounds.max[1] - bounds.min[1] + 1) * 0.5
    const sz = (bounds.max[2] - bounds.min[2] + 1) * 0.5
    const cx = ((bounds.min[0] + bounds.max[0] + 1) / 2 + ox) * 0.5
    const cy = ((bounds.min[1] + bounds.max[1] + 1) / 2) * 0.5
    const cz = ((bounds.min[2] + bounds.max[2] + 1) / 2 + oz) * 0.5
    this.target = [cx, cy, cz]
    // 用包围球拟合，按竖直视角与画幅比例取较大的一侧
    const radius = 0.5 * Math.hypot(sx, sy, sz)
    const vFov = this.fov
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(0.6, aspect))
    const halfMin = Math.min(vFov, hFov) / 2
    this.distance = (radius / Math.sin(halfMin)) * 1.14
  }

  worldToScreen(p, w, h) {
    this.update()
    const v = mat4LookAt(this.eye, this.target, [0, 1, 0])
    const pr = mat4Perspective(this.fov, w / h, this.near, this.far)
    const vp = mat4Mul(pr, v)
    const c = [
      vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12],
      vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13],
      vp[2] * p[0] + vp[6] * p[1] + vp[10] * p[2] + vp[14],
      vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15],
    ]
    if (c[3] <= 0.0001) return null
    return [((c[0] / c[3]) * 0.5 + 0.5) * w, (0.5 - (c[1] / c[3]) * 0.5) * h, c[2] / c[3]]
  }

  ray(px, py, w, h) {
    this.update()
    const inv = mat4Invert(this.viewProj(w / h).viewProj)
    const x = (px / w) * 2 - 1
    const y = 1 - (py / h) * 2
    const pn = transformPoint(inv, [x, y, 0])
    const pf = transformPoint(inv, [x, y, 1])
    return { origin: this.eye.slice(), dir: v3.norm(v3.sub(pf, pn)) }
  }
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ok = false
    this.error = null
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.mesh = null
    this.gpuMesh = null
    this.tgpuMesh = null
    this.overlayLines = []
    this.overlayDirty = true
    this.overlayBuffer = null
    this.overlayCapacity = 0
    this.lineVertexCount = 0
    this.skyTint = [1, 1, 1, 1]
    this.exposure = 1.0
    this.ssaoParams = [0.42, 1.05]
    this.time = 0
    this.pixelRatio = 1
  }

  async init() {
    if (!navigator.gpu) throw new Error('当前浏览器未启用 WebGPU。请使用 Chrome / Edge 113 以上版本打开。')
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) throw new Error('没有可用的 GPU 适配器（WebGPU adapter 为空）。')
    this.adapter = adapter
    const device = await adapter.requestDevice()
    this.device = device
    this.adapterInfo = adapter.info ? { ...adapter.info } : {}
    device.lost.then((info) => {
      this.ok = false
      this.error = 'GPU 设备丢失：' + info.message
    })

    const ctx = this.canvas.getContext('webgpu')
    if (!ctx) throw new Error('无法获取 WebGPU 画布上下文。')
    this.ctx = ctx
    const format = navigator.gpu.getPreferredCanvasFormat()
    this.format = format
    ctx.configure({ device, format, alphaMode: 'opaque' })
    if (!this.camera) this.camera = new OrbitCamera()
    this.buildTargets()
    this.buildPipelines()
    this.ok = true
    return this
  }

  buildTargets() {
    const device = this.device
    const w = Math.max(2, Math.floor(this.canvas.clientWidth * this.dpr))
    const h = Math.max(2, Math.floor(this.canvas.clientHeight * this.dpr))
    this.width = w
    this.height = h
    this.canvas.width = w
    this.canvas.height = h

    const destroy = (t) => t && t.destroy()
    destroy(this.depthTex)
    destroy(this.normalTex)
    destroy(this.colorTex)
    destroy(this.aoTex)
    destroy(this.shadowTex)

    this.depthTex = device.createTexture({
      size: [w, h],
      format: 'depth32float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    })
    this.normalTex = device.createTexture({
      size: [w, h],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    })
    this.colorTex = device.createTexture({
      size: [w, h],
      format: 'rgba16float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    })
    this.aoTex = device.createTexture({
      size: [w, h],
      format: 'r8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    })
    this.shadowTex = device.createTexture({
      size: [SHADOW_SIZE, SHADOW_SIZE],
      format: 'depth32float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    })
    this.shadowDepthView = this.shadowTex.createView()
    this.depthView = this.depthTex.createView()
    this.normalView = this.normalTex.createView()
    this.colorView = this.colorTex.createView()
    this.aoView = this.aoTex.createView()

    this.linearSampler = this.linearSampler || device.createSampler({ magFilter: 'linear', minFilter: 'linear' })
    this.shadowSampler =
      this.shadowSampler ||
      device.createSampler({ compare: 'less-equal', magFilter: 'linear', minFilter: 'linear' })

    this.camBuf = this.camBuf || device.createBuffer({ size: 208, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    this.shadowCamBuf =
      this.shadowCamBuf || device.createBuffer({ size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    this.aoBuf = this.aoBuf || device.createBuffer({ size: 176, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    this.postBuf = this.postBuf || device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    this.overlayBuf = this.overlayBuf || device.createBuffer({ size: 112, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })

    if (this.pipelines) this.buildBindGroups()
  }

  buildPipelines() {
    const device = this.device
    const P = {}
    P.shadow = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: device.createShaderModule({ code: WGSL_SHADOW }), entryPoint: 'vs', buffers: [this.meshLayout()] },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: {
        format: 'depth32float',
        depthWriteEnabled: true,
        depthCompare: 'less',
        depthBias: 2,
        depthBiasSlopeScale: 2.0,
      },
    })

    const forwardModule = device.createShaderModule({ code: WGSL_FORWARD })
    // 不透明与透明两个管线共用同一套绑定布局，否则 auto layout 会各生成一份，BindGroup 不通用
    const forwardBGL = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'depth' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'comparison' } },
      ],
    })
    const forwardLayout = device.createPipelineLayout({ bindGroupLayouts: [forwardBGL] })
    const forwardTargets = [
      {
        format: 'rgba16float',
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      },
      { format: 'rgba8unorm' },
    ]
    P.forward = device.createRenderPipeline({
      layout: forwardLayout,
      vertex: { module: forwardModule, entryPoint: 'vs', buffers: [this.meshLayout()] },
      fragment: { module: forwardModule, entryPoint: 'fs', targets: forwardTargets },
      primitive: { topology: 'triangle-list', cullMode: 'back' },
      depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' },
    })
    P.forwardTransparent = device.createRenderPipeline({
      layout: forwardLayout,
      vertex: { module: forwardModule, entryPoint: 'vs', buffers: [this.meshLayout()] },
      fragment: { module: forwardModule, entryPoint: 'fs', targets: forwardTargets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'less' },
    })
    this.forwardBGL = forwardBGL

    const aoModule = device.createShaderModule({ code: WGSL_SSAO })
    P.ssao = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: aoModule, entryPoint: 'vs' },
      fragment: { module: aoModule, entryPoint: 'fs', targets: [{ format: 'r8unorm' }] },
      primitive: { topology: 'triangle-list' },
    })

    const compModule = device.createShaderModule({ code: WGSL_COMPOSITE })
    P.composite = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: compModule, entryPoint: 'vs' },
      fragment: { module: compModule, entryPoint: 'fs', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list' },
    })

    const ovModule = device.createShaderModule({ code: WGSL_OVERLAY })
    P.overlay = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: ovModule,
        entryPoint: 'vs',
        buffers: [
          {
            arrayStride: 64,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },
              { shaderLocation: 1, offset: 16, format: 'float32x3' },
              { shaderLocation: 2, offset: 32, format: 'float32x4' },
              { shaderLocation: 3, offset: 48, format: 'float32x4' },
            ],
          },
        ],
      },
      fragment: {
        module: ovModule,
        entryPoint: 'fs',
        targets: [
          {
            format: this.format,
            blend: {
              color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            },
          },
        ],
      },
      primitive: { topology: 'triangle-strip' },
    })
    this.pipelines = P
    this.buildBindGroups()
  }

  meshLayout() {
    return {
      arrayStride: 40,
      attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' },
        { shaderLocation: 1, offset: 12, format: 'float32x3' },
        { shaderLocation: 2, offset: 24, format: 'float32x4' },
      ],
    }
  }

  buildBindGroups() {
    const device = this.device
    const P = this.pipelines
    if (!P) return
    this.shadowBG = device.createBindGroup({
      layout: P.shadow.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.shadowCamBuf } }],
    })
    this.forwardBG = device.createBindGroup({
      layout: this.forwardBGL,
      entries: [
        { binding: 0, resource: { buffer: this.camBuf } },
        { binding: 1, resource: this.shadowDepthView },
        { binding: 2, resource: this.shadowSampler },
      ],
    })
    this.aoBG = device.createBindGroup({
      layout: P.ssao.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.aoBuf } },
        { binding: 1, resource: this.depthView },
        { binding: 2, resource: this.normalView },
      ],
    })
    this.compBG = device.createBindGroup({
      layout: P.composite.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.postBuf } },
        { binding: 1, resource: this.colorView },
        { binding: 2, resource: this.depthView },
        { binding: 3, resource: this.aoView },
        { binding: 4, resource: this.linearSampler },
      ],
    })
    this.overlayBG = device.createBindGroup({
      layout: P.overlay.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.overlayBuf } },
        { binding: 1, resource: this.depthView },
      ],
    })
  }

  setGround(size = 80, colorLinear = [0.075, 0.085, 0.1]) {
    if (!this.device) return
    const h = size / 2
    const y = -0.01
    // 逆时针（从上往下看）保证 +Y 法线朝上
    const verts = [
      [-h, y, h], [h, y, h], [h, y, -h],
      [-h, y, h], [h, y, -h], [-h, y, -h],
    ]
    const pos = new Float32Array(verts.flat())
    const nrm = new Float32Array(18)
    const col = new Float32Array(24)
    for (let i = 0; i < 6; i++) {
      nrm[i * 3 + 1] = 1
      col[i * 4] = colorLinear[0]
      col[i * 4 + 1] = colorLinear[1]
      col[i * 4 + 2] = colorLinear[2]
      col[i * 4 + 3] = 1
    }
    const idx = new Uint32Array([0, 1, 2, 3, 4, 5])
    this.groundMesh = this.uploadMesh({ positions: pos, normals: nrm, colors: col, indices: idx })
  }

  setMesh(mesh) {
    if (!this.device) return
    this.mesh = mesh
    this.gpuMesh = this.uploadMesh(mesh)
    this.tgpuMesh = mesh.transparent && mesh.transparent.count ? this.uploadTransparent(mesh) : null
  }

  interleave(pos, nrm, col) {
    const n = pos.length / 3
    const out = new Float32Array(n * 10)
    for (let i = 0; i < n; i++) {
      out[i * 10 + 0] = pos[i * 3]
      out[i * 10 + 1] = pos[i * 3 + 1]
      out[i * 10 + 2] = pos[i * 3 + 2]
      out[i * 10 + 3] = nrm[i * 3]
      out[i * 10 + 4] = nrm[i * 3 + 1]
      out[i * 10 + 5] = nrm[i * 3 + 2]
      out[i * 10 + 6] = col[i * 4]
      out[i * 10 + 7] = col[i * 4 + 1]
      out[i * 10 + 8] = col[i * 4 + 2]
      out[i * 10 + 9] = col[i * 4 + 3]
    }
    return out
  }

  uploadMesh(mesh) {
    const device = this.device
    const vdata = this.interleave(mesh.positions, mesh.normals, mesh.colors)
    const vbuf = device.createBuffer({
      size: Math.max(16, vdata.byteLength),
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(vbuf, 0, vdata)
    const ibuf = device.createBuffer({
      size: Math.max(16, mesh.indices.byteLength),
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    })
    if (mesh.indices.byteLength) device.queue.writeBuffer(ibuf, 0, mesh.indices)
    return { vbuf, ibuf, indexCount: mesh.indices.length }
  }

  uploadTransparent(mesh) {
    const device = this.device
    const t = mesh.transparent
    const vdata = this.interleave(t.positions, t.normals, t.colors)
    const vbuf = device.createBuffer({
      size: Math.max(16, vdata.byteLength),
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(vbuf, 0, vdata)
    const ibuf = device.createBuffer({
      size: Math.max(16, t.count * 6 * 4),
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    })
    return { vbuf, ibuf, indexCount: 0, maxIndex: t.count * 6, loadedKey: null }
  }

  updateTransparentOrder(eye) {
    if (!this.tgpuMesh) return
    const key = [Math.round(eye[0] * 8), Math.round(eye[1] * 8), Math.round(eye[2] * 8)].join(',')
    if (this.tgpuMesh.loadedKey === key) return
    const idx = sortTransparent(this.mesh, eye)
    this.device.queue.writeBuffer(this.tgpuMesh.ibuf, 0, idx)
    this.tgpuMesh.indexCount = idx.length
    this.tgpuMesh.loadedKey = key
  }

  setOverlay(lines) {
    this.overlayLines = lines
    this.overlayDirty = true
  }

  ensureOverlayCapacity(n) {
    if (n <= this.overlayCapacity) return
    const cap = Math.max(4096, 1 << Math.ceil(Math.log2(n)))
    if (this.overlayVbuf) this.overlayVbuf.destroy()
    this.overlayVbuf = this.device.createBuffer({
      size: cap * 64,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    this.overlayCapacity = cap
  }

  uploadOverlay() {
    const lines = this.overlayLines || []
    const n = lines.length
    this.lineVertexCount = n
    if (!n) return
    this.ensureOverlayCapacity(n)
    const data = new Float32Array(n * 16)
    for (let i = 0; i < n; i++) {
      const l = lines[i]
      const o = i * 16
      data[o + 0] = l.a[0]; data[o + 1] = l.a[1]; data[o + 2] = l.a[2]; data[o + 3] = 0
      data[o + 4] = l.b[0]; data[o + 5] = l.b[1]; data[o + 6] = l.b[2]; data[o + 7] = 0
      const c = l.color
      data[o + 8] = c[0]; data[o + 9] = c[1]; data[o + 10] = c[2]; data[o + 11] = c[3] ?? 1
      data[o + 12] = l.width ?? 1.4
      data[o + 13] = l.xray ? 1 : 0
      data[o + 14] = l.dash ?? 0
      data[o + 15] = 0
    }
    this.device.queue.writeBuffer(this.overlayVbuf, 0, data)
  }

  resize() {
    if (!this.device) return
    const w = Math.floor(this.canvas.clientWidth * this.dpr)
    const h = Math.floor(this.canvas.clientHeight * this.dpr)
    if (w === this.width && h === this.height) return
    if (w < 2 || h < 2) return
    this.buildTargets()
  }

  lightMatrix() {
    // 固定方向的主光，围绕模型整体包围盒取正交投影
    const dir = v3.norm([-0.55, -0.78, -0.34])
    const center = [0, 1.4, 0]
    const eye = v3.add(center, v3.scale(dir, -34))
    const view = mat4LookAt(eye, center, [0, 1, 0])
    // 正交投影（透视做阴影会在边缘漏光），覆盖 ±26 m
    const r = 26
    const n = 1
    const f = 90
    const ortho = new Float32Array(16)
    ortho[0] = 1 / r
    ortho[5] = 1 / r
    ortho[10] = 1 / (n - f)
    ortho[14] = n / (n - f)
    ortho[15] = 1
    return { mat: mat4Mul(ortho, view), dir }
  }

  render() {
    if (!this.ok) return
    this.resize()
    const device = this.device
    const w = this.width
    const h = this.height
    const aspect = w / h
    const cam = this.camera
    const mvp = cam.viewProj(aspect)
    const { mat: lightMat, dir: lightDir } = this.lightMatrix()

    // 相机 uniform
    const camData = new Float32Array(52)
    camData.set(mvp.viewProj, 0)
    camData.set(lightMat, 16)
    camData.set([...cam.eye, 1], 32)
    camData.set([...v3.scale(lightDir, -1), 1.1], 36)
    camData.set([cam.near, cam.far, this.time, 1], 40)
    camData.set([this.skyTint[0], this.skyTint[1], this.skyTint[2], 1], 44)
    device.queue.writeBuffer(this.camBuf, 0, camData)
    device.queue.writeBuffer(this.shadowCamBuf, 0, lightMat)

    const invVP = mat4Invert(mvp.viewProj)
    const aoData = new Float32Array(44)
    aoData.set(invVP, 0)
    aoData.set(mvp.viewProj, 16)
    aoData.set([this.ssaoParams[0], this.ssaoParams[1], cam.near, cam.far], 32)
    aoData.set([w, h, 1 / w, 1 / h], 36)
    device.queue.writeBuffer(this.aoBuf, 0, aoData)

    const postData = new Float32Array(32)
    postData.set(invVP, 0)
    postData.set([cam.near, cam.far, this.exposure, this.time], 16)
    postData.set([w, h, 1 / w, 1 / h], 20)
    const bg = this.bgColor || [0.052, 0.062, 0.077, 1]
    postData.set(bg, 24)
    device.queue.writeBuffer(this.postBuf, 0, postData)

    const ovData = new Float32Array(28)
    ovData.set(mvp.viewProj, 0)
    ovData.set([w, h, 1 / w, 1 / h], 16)
    ovData.set([1, 1, this.xrayAlpha ?? 0.0, this.time], 20)
    device.queue.writeBuffer(this.overlayBuf, 0, ovData)

    if (this.overlayDirty) {
      this.uploadOverlay()
      this.overlayDirty = false
    }

    const encoder = device.createCommandEncoder()
    const P = this.pipelines

    // 1) 阴影
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [],
        depthStencilAttachment: {
          view: this.shadowDepthView,
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      })
      pass.setPipeline(P.shadow)
      pass.setBindGroup(0, this.shadowBG)
      if (this.gpuMesh && this.gpuMesh.indexCount) {
        pass.setVertexBuffer(0, this.gpuMesh.vbuf)
        pass.setIndexBuffer(this.gpuMesh.ibuf, 'uint32')
        pass.drawIndexed(this.gpuMesh.indexCount)
      }
      if (this.tgpuMesh && this.tgpuMesh.indexCount) {
        pass.setVertexBuffer(0, this.tgpuMesh.vbuf)
        pass.setIndexBuffer(this.tgpuMesh.ibuf, 'uint32')
        pass.drawIndexed(this.tgpuMesh.indexCount)
      }
      pass.end()
    }

    // 2) 前向渲染
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          { view: this.colorView, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' },
          { view: this.normalView, clearValue: { r: 0.5, g: 0.5, b: 1, a: 1 }, loadOp: 'clear', storeOp: 'store' },
        ],
        depthStencilAttachment: {
          view: this.depthView,
          depthClearValue: 1,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      })
      pass.setBindGroup(0, this.forwardBG)
      if (this.groundMesh) {
        pass.setPipeline(P.forward)
        pass.setVertexBuffer(0, this.groundMesh.vbuf)
        pass.setIndexBuffer(this.groundMesh.ibuf, 'uint32')
        pass.drawIndexed(this.groundMesh.indexCount)
      }
      if (this.gpuMesh && this.gpuMesh.indexCount) {
        pass.setPipeline(P.forward)
        pass.setVertexBuffer(0, this.gpuMesh.vbuf)
        pass.setIndexBuffer(this.gpuMesh.ibuf, 'uint32')
        pass.drawIndexed(this.gpuMesh.indexCount)
      }
      if (this.tgpuMesh) {
        this.updateTransparentOrder(cam.eye)
        if (this.tgpuMesh.indexCount) {
          pass.setPipeline(P.forwardTransparent)
          pass.setVertexBuffer(0, this.tgpuMesh.vbuf)
          pass.setIndexBuffer(this.tgpuMesh.ibuf, 'uint32')
          pass.drawIndexed(this.tgpuMesh.indexCount)
        }
      }
      pass.end()
    }

    // 3) SSAO
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          { view: this.aoView, clearValue: { r: 1, g: 1, b: 1, a: 1 }, loadOp: 'clear', storeOp: 'store' },
        ],
      })
      pass.setPipeline(P.ssao)
      pass.setBindGroup(0, this.aoBG)
      pass.draw(3)
      pass.end()
    }

    // 4) 合成到画布
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: this.ctx.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      })
      pass.setPipeline(P.composite)
      pass.setBindGroup(0, this.compBG)
      pass.draw(3)
      pass.end()
    }

    // 5) 叠加线框（网格、坐标轴、选区和指针盒）
    if (this.lineVertexCount) {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: this.ctx.getCurrentTexture().createView(),
            loadOp: 'load',
            storeOp: 'store',
          },
        ],
      })
      pass.setPipeline(P.overlay)
      pass.setBindGroup(0, this.overlayBG)
      pass.setVertexBuffer(0, this.overlayVbuf)
      pass.draw(4, this.lineVertexCount)
      pass.end()
    }

    device.queue.submit([encoder.finish()])
  }
}

/** Mesh → GPU 顶点/索引缓冲，实例缓冲与 uniform 缓冲的小工具。 */
import type { Mesh } from '../core/geometry';

export interface GpuMesh {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
  bbox: Mesh['bbox'];
  destroy(): void;
}

export function uploadMesh(device: GPUDevice, mesh: Mesh): GpuMesh {
  const vertexBuffer = device.createBuffer({
    size: Math.max(16, mesh.vertices.byteLength),
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, mesh.vertices);
  const indexBuffer = device.createBuffer({
    size: Math.max(16, mesh.indices.byteLength),
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, mesh.indices);
  return {
    vertexBuffer,
    indexBuffer,
    indexCount: mesh.indices.length,
    bbox: mesh.bbox,
    destroy() {
      vertexBuffer.destroy();
      indexBuffer.destroy();
    },
  };
}

export function makeUniformBuffer(device: GPUDevice, size: number): GPUBuffer {
  return device.createBuffer({ size, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
}

/**
 * 钟乳石实例缓冲布局（与 speleo.wgsl 的 Instance 对齐，48 字节/实例）：
 * root.xyz + height | axis.xyz + radius | rgb + shapeSeed
 */
export const INSTANCE_STRIDE = 48;

export function writeSpeleoInstances(
  device: GPUDevice,
  instances: { root: [number, number, number]; axis: [number, number, number]; height: number; radius: number; color: [number, number, number]; shapeSeed: number }[],
): GPUBuffer {
  const data = new Float32Array(instances.length * (INSTANCE_STRIDE / 4));
  instances.forEach((ins, i) => {
    const o = i * 12;
    data[o] = ins.root[0];
    data[o + 1] = ins.root[1];
    data[o + 2] = ins.root[2];
    data[o + 3] = ins.height;
    data[o + 4] = ins.axis[0];
    data[o + 5] = ins.axis[1];
    data[o + 6] = ins.axis[2];
    data[o + 7] = ins.radius;
    data[o + 8] = ins.color[0];
    data[o + 9] = ins.color[1];
    data[o + 10] = ins.color[2];
    data[o + 11] = ins.shapeSeed;
  });
  const buffer = device.createBuffer({
    size: Math.max(16, data.byteLength),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

/** Gizmo 实例：position.xyz+radius, rgba（32 字节）。 */
export const GIZMO_STRIDE = 32;

export function writeGizmos(
  device: GPUDevice,
  gizmos: { position: [number, number, number]; radius: number; color: [number, number, number, number] }[],
): GPUBuffer {
  const data = new Float32Array(gizmos.length * (GIZMO_STRIDE / 4));
  gizmos.forEach((g, i) => {
    const o = i * 8;
    data[o] = g.position[0];
    data[o + 1] = g.position[1];
    data[o + 2] = g.position[2];
    data[o + 3] = g.radius;
    data[o + 4] = g.color[0];
    data[o + 5] = g.color[1];
    data[o + 6] = g.color[2];
    data[o + 7] = g.color[3];
  });
  const buffer = device.createBuffer({
    size: Math.max(16, data.byteLength),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

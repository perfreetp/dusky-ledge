/** WebGPU 设备/上下文初始化与能力门禁。 */
export interface GpuContext {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

export async function initGpu(canvas: HTMLCanvasElement): Promise<GpuContext> {
  if (!('gpu' in navigator)) {
    throw new Error('当前浏览器不支持 WebGPU');
  }
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('未找到可用的 GPU 适配器（可能是驱动过旧或虚拟机环境）');
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) throw new Error('无法获取 WebGPU canvas 上下文');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });
  device.lost.then((info) => {
    console.error('WebGPU device lost:', info.message);
  });
  return { device, context, format };
}

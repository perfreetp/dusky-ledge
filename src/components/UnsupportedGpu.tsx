import { css } from '../ui/style';
export default function UnsupportedGpu() {
  return (
    <div style={css({ display: 'grid', placeItems: 'center', height: '100vh', padding: 24 })}>
      <div style={css({ 'max-width': 560, 'text-align': 'center', 'line-height': 1.8 })}>
        <h2 style={css({ color: 'var(--accent)' })}>当前环境不支持 WebGPU</h2>
        <p class="muted">
          本工作台仅提供 WebGPU 渲染器。请使用已启用 WebGPU 的浏览器，并确认显卡驱动支持：
        </p>
        <ul style={css({ 'text-align': 'left', display: 'inline-block' })}>
          <li>Chrome / Edge 113 及以上（Windows 推荐 Edge 或 Chrome 稳定版）</li>
          <li>在 chrome://gpu 确认 "WebGPU: Hardware accelerated"</li>
          <li>虚拟机或远程桌面环境可能不可用，需要物理显卡或开启 GPU 直通</li>
          <li>驱动过旧时请升级显卡驱动后重试</li>
        </ul>
      </div>
    </div>
  );
}

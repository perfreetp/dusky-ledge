import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  Application, Container, Geometry, Buffer, BufferUsage, Mesh, Shader,
  GlProgram, UniformGroup, Graphics, Text,
} from 'pixi.js';
import { SURFACES, OCCLUDERS, MAX_LIGHTS, BOOTH, kelvinToRGB } from './model';
import { VERT, FRAG } from './glsl';
import { cameraMatrices, projectPoint, rayPlane } from './math';

// 三维展位布光画布: PixiJS Mesh + 自定义着色器, 透视投影
const BoothView = forwardRef(function BoothView(props, ref) {
  const {
    lights, ambient, shadowsOn, darkZones, selectedId,
    cam, onCamChange, onSelectLight, onMoveLight, onMoveAim,
  } = props;

  const holderRef = useRef(null);
  const R = useRef({});            // pixi 运行对象
  const propsRef = useRef(props);  // 事件回调里读最新 props
  propsRef.current = props;

  useImperativeHandle(ref, () => ({
    getPNG() {
      const { app } = R.current;
      if (!app) return null;
      const canvas = app.renderer.extract.canvas(app.stage);
      return canvas.toDataURL('image/png');
    },
  }));

  // ---------- 初始化(一次) ----------
  useEffect(() => {
    let destroyed = false;
    const app = new Application();
    let cleanupFns = [];

    (async () => {
      await app.init({
        resizeTo: holderRef.current,
        antialias: true,
        preference: 'webgl',
        background: 0x0b0e14,
      });
      if (destroyed) return;
      holderRef.current.appendChild(app.canvas);

      const world = new Container();
      world.sortableChildren = true;
      const overlay = new Container();   // 区域网格 + 暗区标红
      const handles = new Container();   // 灯具手柄
      const labels = new Container();
      overlay.zIndex = 1000; handles.zIndex = 2000; labels.zIndex = 3000;
      world.sortableChildren = true;
      app.stage.addChild(world, overlay, handles, labels);
      app.stage.sortableChildren = true;
      app.stage.eventMode = 'static';

      // 共享光照 uniforms
      const lightUG = new UniformGroup({
        uScreen: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
        uAmbient: { value: new Float32Array(3), type: 'vec3<f32>' },
        uShadows: { value: 1, type: 'i32' },
        uNumLights: { value: 0, type: 'i32' },
        uLightPos: { value: new Float32Array(MAX_LIGHTS * 3), type: 'vec3<f32>', size: MAX_LIGHTS },
        uLightAim: { value: new Float32Array(MAX_LIGHTS * 3), type: 'vec3<f32>', size: MAX_LIGHTS },
        uLightColor: { value: new Float32Array(MAX_LIGHTS * 3), type: 'vec3<f32>', size: MAX_LIGHTS },
        uLightParam: { value: new Float32Array(MAX_LIGHTS * 4), type: 'vec4<f32>', size: MAX_LIGHTS },
        uNumOcc: { value: OCCLUDERS.length, type: 'i32' },
        uOcc: { value: new Float32Array(OCCLUDERS.length * 4), type: 'vec4<f32>', size: OCCLUDERS.length },
        uOccH: { value: new Float32Array(OCCLUDERS.length), type: 'f32', size: OCCLUDERS.length },
      });
      OCCLUDERS.forEach((o, i) => {
        lightUG.uniforms.uOcc.set([o.a[0], o.a[1], o.b[0], o.b[1]], i * 4);
        lightUG.uniforms.uOccH[i] = o.h;
      });
      lightUG.update();

      const glProgram = GlProgram.from({ vertex: VERT, fragment: FRAG });

      // 每个表面一个 Mesh: aPos 屏幕坐标(每帧重算), aWorld/aNorm 静态
      const meshes = SURFACES.map((s) => {
        const posBuf = new Buffer({ data: new Float32Array(8), usage: BufferUsage.VERTEX | BufferUsage.COPY_DST });
        const worldBuf = new Buffer({ data: new Float32Array(s.corners.flat()), usage: BufferUsage.VERTEX });
        const normBuf = new Buffer({ data: new Float32Array(s.corners.flatMap(() => s.normal)), usage: BufferUsage.VERTEX });
        const geometry = new Geometry({
          attributes: {
            aPos: { buffer: posBuf, format: 'float32x2' },
            aWorld: { buffer: worldBuf, format: 'float32x3' },
            aNorm: { buffer: normBuf, format: 'float32x3' },
          },
          indexBuffer: new Buffer({ data: new Uint32Array([0, 1, 2, 0, 2, 3]), usage: BufferUsage.INDEX }),
        });
        const matUG = new UniformGroup({
          uAlbedo: { value: new Float32Array(s.albedo), type: 'vec3<f32>' },
        });
        const shader = new Shader({ glProgram, resources: { uni: lightUG, mat: matUG } });
        const mesh = new Mesh({ geometry, shader });
        world.addChild(mesh);
        return { mesh, posBuf, surface: s };
      });

      const overlayG = new Graphics();
      const handleG = new Graphics();
      overlay.addChild(overlayG);
      handles.addChild(handleG);

      R.current = {
        app, world, meshes, lightUG, overlayG, handleG, labels,
        labelMap: new Map(),
        screenLights: [],
        drag: null,
      };

      // ---------- 交互 ----------
      const stage = app.stage;
      const onDown = (e) => {
        const p = { x: e.global.x, y: e.global.y };
        const hit = hitHandle(p);
        const pr = propsRef.current;
        if (hit) {
          R.current.drag = { type: hit.type, id: hit.id, moved: false };
          pr.onSelectLight(hit.id);
        } else {
          R.current.drag = { type: 'cam', lastX: p.x, lastY: p.y, moved: false };
        }
      };
      const onMove = (e) => {
        const d = R.current.drag;
        if (!d) return;
        const p = { x: e.global.x, y: e.global.y };
        const pr = propsRef.current;
        if (d.type === 'cam') {
          const dx = p.x - d.lastX, dy = p.y - d.lastY;
          d.lastX = p.x; d.lastY = p.y;
          if (Math.abs(dx) + Math.abs(dy) > 0) d.moved = true;
          const c = pr.cam;
          pr.onCamChange({
            ...c,
            yaw: c.yaw + dx * 0.006,
            pitch: Math.min(1.5, Math.max(0.12, c.pitch + dy * 0.005)),
          });
        } else {
          d.moved = true;
          const light = pr.lights.find((l) => l.id === d.id);
          if (!light) return;
          const { invVp } = R.current.mats;
          const W = app.screen.width, H = app.screen.height;
          if (d.type === 'light') {
            const hitP = rayPlane(invVp, p.x, p.y, W, H, light.h);
            if (hitP) {
              const x = Math.min(BOOTH.W - 0.1, Math.max(0.1, hitP[0]));
              const z = Math.min(BOOTH.D - 0.1, Math.max(0.1, hitP[2]));
              pr.onMoveLight(d.id, x, z);
            }
          } else if (d.type === 'aim') {
            const hitP = rayPlane(invVp, p.x, p.y, W, H, 0);
            if (hitP) {
              const x = Math.min(BOOTH.W, Math.max(0, hitP[0]));
              const z = Math.min(BOOTH.D, Math.max(0, hitP[2]));
              pr.onMoveAim(d.id, x, z);
            }
          }
        }
      };
      const onUp = () => { R.current.drag = null; };
      stage.on('pointerdown', onDown);
      stage.on('globalpointermove', onMove);
      stage.on('pointerup', onUp);
      stage.on('pointerupoutside', onUp);

      const onWheel = (e) => {
        e.preventDefault();
        const pr = propsRef.current;
        const c = pr.cam;
        pr.onCamChange({ ...c, dist: Math.min(20, Math.max(3.5, c.dist * (1 + e.deltaY * 0.001))) });
      };
      app.canvas.addEventListener('wheel', onWheel, { passive: false });

      const ro = new ResizeObserver(() => rebuild());
      ro.observe(holderRef.current);

      cleanupFns = [
        () => stage.off('pointerdown', onDown),
        () => app.canvas.removeEventListener('wheel', onWheel),
        () => ro.disconnect(),
      ];

      rebuild();
    })();

    function hitHandle(p) {
      const { screenLights } = R.current;
      for (const s of screenLights) {
        if (Math.hypot(p.x - s.ax, p.y - s.ay) < 10) return { type: 'aim', id: s.id };
      }
      for (const s of screenLights) {
        if (Math.hypot(p.x - s.x, p.y - s.y) < 13) return { type: 'light', id: s.id };
      }
      return null;
    }

    // ---------- 每帧重建(相机/灯光变化时由 React effect 触发) ----------
    function rebuild() {
      const r = R.current;
      if (!r.app || !r.app.renderer) return;
      const pr = propsRef.current;
      const W = r.app.screen.width, H = r.app.screen.height;
      if (W < 2 || H < 2) return;
      r.app.stage.hitArea = r.app.screen;
      r.app.renderer.background.color = pr.ambient.bg;

      const mats = cameraMatrices(pr.cam, W / H);
      r.mats = mats;

      // 表面顶点重投影 + 按深度排序
      for (const m of r.meshes) {
        let depth = 0;
        m.surface.corners.forEach((c, i) => {
          const s = projectPoint(mats.vp, c, W, H);
          m.posBuf.data[i * 2] = s.x;
          m.posBuf.data[i * 2 + 1] = s.y;
          depth += s.depth;
        });
        m.posBuf.update();
        m.mesh.zIndex = -(depth / 4);
      }

      // 光照 uniforms
      const u = r.lightUG.uniforms;
      u.uScreen[0] = W; u.uScreen[1] = H;
      const amb = pr.ambient;
      u.uAmbient[0] = amb.color[0] * amb.lux;
      u.uAmbient[1] = amb.color[1] * amb.lux;
      u.uAmbient[2] = amb.color[2] * amb.lux;
      u.uShadows = pr.shadowsOn ? 1 : 0;
      const ls = pr.lights.slice(0, MAX_LIGHTS);
      u.uNumLights = ls.length;
      ls.forEach((L, i) => {
        u.uLightPos.set([L.x, L.h, L.z], i * 3);
        const aim = [L.aimX - L.x, -L.h, L.aimZ - L.z];
        const al = Math.hypot(...aim) || 1;
        u.uLightAim.set([aim[0] / al, aim[1] / al, aim[2] / al], i * 3);
        u.uLightColor.set(kelvinToRGB(L.temp), i * 3);
        const half = ((L.angle / 2) * Math.PI) / 180;
        u.uLightParam.set([L.intensity, Math.cos(half), Math.cos(half * 0.8), L.on ? 1 : 0], i * 4);
      });
      r.lightUG.update();

      // 区域网格 + 暗区标红
      const g = r.overlayG;
      g.clear();
      for (let xi = 0; xi <= BOOTH.W; xi++) {
        const a = projectPoint(mats.vp, [xi, 0.01, 0], W, H);
        const b = projectPoint(mats.vp, [xi, 0.01, BOOTH.D], W, H);
        g.moveTo(a.x, a.y).lineTo(b.x, b.y);
      }
      for (let zi = 0; zi <= BOOTH.D; zi++) {
        const a = projectPoint(mats.vp, [0, 0.01, zi], W, H);
        const b = projectPoint(mats.vp, [BOOTH.W, 0.01, zi], W, H);
        g.moveTo(a.x, a.y).lineTo(b.x, b.y);
      }
      g.stroke({ width: 1, color: 0xffffff, alpha: 0.08 });
      for (const z of pr.darkZones) {
        const pts = [
          [z.xi, 0.02, z.zi], [z.xi + 1, 0.02, z.zi],
          [z.xi + 1, 0.02, z.zi + 1], [z.xi, 0.02, z.zi + 1],
        ].map((c) => projectPoint(mats.vp, c, W, H));
        g.poly(pts.flatMap((p) => [p.x, p.y]), true).fill({ color: 0xff2a2a, alpha: 0.4 });
        g.poly(pts.flatMap((p) => [p.x, p.y]), true).stroke({ width: 1.5, color: 0xff5555, alpha: 0.9 });
      }

      // 灯具手柄
      const hg = r.handleG;
      hg.clear();
      r.screenLights = [];
      const seen = new Set();
      for (const L of pr.lights) {
        const sp = projectPoint(mats.vp, [L.x, L.h, L.z], W, H);
        const ap = projectPoint(mats.vp, [L.aimX, 0.02, L.aimZ], W, H);
        r.screenLights.push({ id: L.id, x: sp.x, y: sp.y, ax: ap.x, ay: ap.y });
        const col = kelvinToRGB(L.temp);
        const hex = (Math.round(col[0] * 255) << 16) | (Math.round(col[1] * 255) << 8) | Math.round(col[2] * 255);
        const sel = L.id === pr.selectedId;
        hg.moveTo(sp.x, sp.y).lineTo(ap.x, ap.y).stroke({ width: 1, color: hex, alpha: L.on ? 0.5 : 0.15 });
        hg.circle(ap.x, ap.y, 4).fill({ color: hex, alpha: L.on ? 0.9 : 0.3 });
        hg.circle(sp.x, sp.y, sel ? 9 : 7).fill({ color: hex, alpha: L.on ? 1 : 0.35 });
        hg.circle(sp.x, sp.y, sel ? 9 : 7).stroke({ width: sel ? 2.5 : 1.2, color: sel ? 0xffffff : 0xcccccc, alpha: 0.9 });
        if (sel) hg.circle(sp.x, sp.y, 13).stroke({ width: 1, color: 0xffffff, alpha: 0.5 });

        // 标签缓存
        let t = r.labelMap.get(L.id);
        if (!t) {
          t = new Text({ text: L.name, style: { fontSize: 11, fill: 0xffffff, fontFamily: 'sans-serif' } });
          t.anchor.set(0.5, 1);
          r.labelMap.set(L.id, t);
          r.labels.addChild(t);
        }
        if (t.text !== L.name) t.text = L.name;
        t.position.set(sp.x, sp.y - 12);
        t.alpha = L.on ? 0.95 : 0.4;
        seen.add(L.id);
      }
      for (const [id, t] of r.labelMap) {
        if (!seen.has(id)) { t.destroy(); r.labelMap.delete(id); }
      }

      // 测试钩子: 暴露手柄屏幕坐标
      window.__screenLights = r.screenLights;
    }
    R.rebuild = rebuild;

    return () => {
      destroyed = true;
      cleanupFns.forEach((f) => f());
      try { app.destroy(true, { children: true }); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 任意 props 变化后重投影/重绘
  useEffect(() => {
    if (R.rebuild) R.rebuild();
  });

  return <div ref={holderRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
});

export default BoothView;

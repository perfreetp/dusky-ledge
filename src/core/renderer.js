// WebGL2 渲染器:网格、骨骼线、旋转手柄、地面网格
import {
  mat4Perspective, mat4LookAt, mat4Multiply, mat4Invert, mat4TransformPoint,
  mat4Translation, mat3FromMat4, V3,
} from './math.js';

const VS = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uViewProj;
uniform mat3 uNormalMat;
out vec3 vNormal;
out vec3 vWorld;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  vWorld = w.xyz;
  vNormal = uNormalMat * aNormal;
  gl_Position = uViewProj * w;
}`;

const FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vWorld;
uniform vec3 uColor;
uniform vec3 uLightDir;
uniform vec3 uEye;
uniform float uUnlit;
uniform float uAlpha;
out vec4 fragColor;
void main() {
  if (uUnlit > 0.5) { fragColor = vec4(uColor, uAlpha); return; }
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  float diff = max(dot(n, normalize(uLightDir)), 0.0);
  vec3 v = normalize(uEye - vWorld);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 2.5) * 0.35;
  vec3 col = uColor * (0.32 + 0.68 * diff) + rim * vec3(1.0, 0.9, 0.6);
  fragColor = vec4(col, uAlpha);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s) || 'shader error');
  return s;
}

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: true, preserveDrawingBuffer: true });
  if (!gl) throw new Error('当前环境不支持 WebGL2');

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(prog) || 'link error');
  gl.useProgram(prog);

  const U = {};
  for (const name of ['uModel', 'uViewProj', 'uNormalMat', 'uColor', 'uLightDir', 'uEye', 'uUnlit', 'uAlpha'])
    U[name] = gl.getUniformLocation(prog, name);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const meshCache = new Map(); // mesh对象 -> {vao, count}

  function gpuMesh(mesh) {
    let rec = meshCache.get(mesh);
    if (rec) return rec;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const mk = (data, loc, size) => {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      return buf;
    };
    mk(mesh.positions, 0, 3);
    mk(mesh.normals, 1, 3);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    rec = { vao, count: mesh.indices.length, dynPos: null, dynNrm: null };
    meshCache.set(mesh, rec);
    return rec;
  }

  // 可动态更新的网格(狮被蒙皮)
  function gpuDynamicMesh(mesh) {
    let rec = meshCache.get(mesh);
    if (rec && rec.dynPos) return rec;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const dynPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dynPos);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    const dynNrm = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dynNrm);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    rec = { vao, count: mesh.indices.length, dynPos, dynNrm };
    meshCache.set(mesh, rec);
    return rec;
  }

  function updateDynamic(rec, positions, normals) {
    gl.bindBuffer(gl.ARRAY_BUFFER, rec.dynPos);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
    gl.bindBuffer(gl.ARRAY_BUFFER, rec.dynNrm);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, normals);
  }

  // 线段(骨骼、地面网格)用动态缓冲
  const lineVao = gl.createVertexArray();
  gl.bindVertexArray(lineVao);
  const lineBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
  gl.bufferData(gl.ARRAY_BUFFER, 6 * 256 * 4, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // 相机
  const camera = {
    target: [0, 1, 0],
    dist: 6.5,
    yaw: 35,
    pitch: 18,
    eye() {
      const cy = Math.cos((this.yaw * Math.PI) / 180), sy = Math.sin((this.yaw * Math.PI) / 180);
      const cp = Math.cos((this.pitch * Math.PI) / 180), sp = Math.sin((this.pitch * Math.PI) / 180);
      return [
        this.target[0] + this.dist * cp * sy,
        this.target[1] + this.dist * sp,
        this.target[2] + this.dist * cp * cy,
      ];
    },
    viewProj(aspect) {
      const proj = mat4Perspective(45, aspect, 0.05, 200);
      const view = mat4LookAt(this.eye(), this.target, [0, 1, 0]);
      return mat4Multiply(proj, view);
    },
  };

  let viewProj = null, invViewProj = null, w = 1, h = 1;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth * dpr, ch = canvas.clientHeight * dpr;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw; canvas.height = ch;
    }
    w = canvas.width; h = canvas.height;
  }

  function begin() {
    resize();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0.09, 0.1, 0.13, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    viewProj = camera.viewProj(w / h);
    invViewProj = mat4Invert(viewProj);
    gl.useProgram(prog);
    gl.uniformMatrix4fv(U.uViewProj, false, new Float32Array(viewProj));
    gl.uniform3fv(U.uLightDir, new Float32Array(V3.norm([0.6, 1, 0.45])));
    gl.uniform3fv(U.uEye, new Float32Array(camera.eye()));
  }

  function drawMesh(mesh, model, color, { unlit = false, alpha = 1, cull = true, dynamic = false } = {}) {
    const rec = dynamic ? gpuDynamicMesh(mesh) : gpuMesh(mesh);
    if (dynamic && mesh._dirty) {
      updateDynamic(rec, mesh.positions, mesh.normals);
      mesh._dirty = false;
    }
    gl.uniformMatrix4fv(U.uModel, false, new Float32Array(model));
    gl.uniformMatrix3fv(U.uNormalMat, false, new Float32Array(mat3FromMat4(model)));
    gl.uniform3fv(U.uColor, new Float32Array(color));
    gl.uniform1f(U.uUnlit, unlit ? 1 : 0);
    gl.uniform1f(U.uAlpha, alpha);
    if (cull) { gl.enable(gl.CULL_FACE); } else { gl.disable(gl.CULL_FACE); }
    gl.bindVertexArray(rec.vao);
    gl.drawElements(gl.TRIANGLES, rec.count, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  function drawLines(verts, color, alpha = 1) {
    if (!verts.length) return;
    gl.uniformMatrix4fv(U.uModel, false, new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]));
    gl.uniformMatrix3fv(U.uNormalMat, false, new Float32Array([1,0,0, 0,1,0, 0,0,1]));
    gl.uniform3fv(U.uColor, new Float32Array(color));
    gl.uniform1f(U.uUnlit, 1);
    gl.uniform1f(U.uAlpha, alpha);
    gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(lineVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(verts));
    gl.drawArrays(gl.LINES, 0, verts.length / 3);
    gl.bindVertexArray(null);
  }

  // 屏幕像素 -> 世界射线
  function pickRay(px, py) {
    const rect = canvas.getBoundingClientRect();
    const x = ((px - rect.left) / rect.width) * 2 - 1;
    const y = 1 - ((py - rect.top) / rect.height) * 2;
    const near = mat4TransformPoint(invViewProj, [x, y, -1]);
    const far = mat4TransformPoint(invViewProj, [x, y, 1]);
    return { ro: near, rd: V3.norm(V3.sub(far, near)) };
  }

  return { gl, canvas, camera, begin, drawMesh, drawLines, pickRay, mat4Translation };
}

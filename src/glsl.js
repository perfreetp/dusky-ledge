// 自定义着色器: 透视投影后的屏幕空间顶点 + 世界坐标光照计算
// 光斑形状 / 多灯叠色 / 软阴影 全部在片元着色器内按物理模型累加

export const VERT = `#version 300 es
in vec2 aPos;
in vec3 aWorld;
in vec3 aNorm;
uniform vec2 uScreen;
out vec3 vWorld;
out vec3 vNorm;
void main() {
  vec2 c = (aPos / uScreen) * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
  vWorld = aWorld;
  vNorm = aNorm;
}
`;

export const FRAG = `#version 300 es
precision highp float;

#define MAXL 12
#define MAXO 10

in vec3 vWorld;
in vec3 vNorm;

uniform vec3 uAlbedo;
uniform vec2 uScreen;
uniform vec3 uAmbient;      // 环境光辐照度 RGB (白天/夜间不同)
uniform int uShadows;       // 1 计算阴影, 0 只看光斑
uniform int uNumLights;
uniform vec3 uLightPos[MAXL];
uniform vec3 uLightAim[MAXL];    // 归一化照射方向
uniform vec3 uLightColor[MAXL];  // 色温换算的 RGB
uniform vec4 uLightParam[MAXL];  // x:亮度 y:cos外半角 z:cos内半角 w:开关
uniform int uNumOcc;
uniform vec4 uOcc[MAXO];    // x1,z1,x2,z2 遮挡线段
uniform float uOccH[MAXO];  // 遮挡体高度

out vec4 fragColor;

float cross2(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }

// 2D 射线 o+t*d 与线段 ab 求交
float raySeg(vec2 o, vec2 d, vec2 a, vec2 b) {
  vec2 e = b - a;
  float den = cross2(d, e);
  if (abs(den) < 1e-9) return -1.0;
  float t = cross2(a - o, e) / den;
  float s = cross2(a - o, d) / den;
  if (t > 0.02 && t < 0.999 && s >= 0.0 && s <= 1.0) return t;
  return -1.0;
}

float visFrom(vec3 P, vec3 L) {
  vec3 d = L - P;
  for (int i = 0; i < MAXO; i++) {
    if (i >= uNumOcc) break;
    float t = raySeg(P.xz, d.xz, uOcc[i].xy, uOcc[i].zw);
    if (t > 0.0) {
      float y = P.y + t * d.y;
      if (y < uOccH[i]) return 0.0;
    }
  }
  return 1.0;
}

// 软阴影: 面光源 5 次采样, 半影宽度随灯距与遮挡距离自然变化
float visibility(vec3 P, vec3 L) {
  if (uShadows == 0) return 1.0;
  vec3 d = L - P;
  vec3 dir = normalize(d);
  vec3 up = abs(dir.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 u = normalize(cross(dir, up));
  vec3 v = normalize(cross(dir, u));
  float r = 0.12;
  float s = visFrom(P, L);
  s += visFrom(P, L + u * r);
  s += visFrom(P, L - u * r);
  s += visFrom(P, L + v * r);
  s += visFrom(P, L - v * r);
  return s / 5.0;
}

void main() {
  vec3 N = normalize(vNorm);
  vec3 irr = uAmbient;
  for (int i = 0; i < MAXL; i++) {
    if (i >= uNumLights) break;
    vec4 pr = uLightParam[i];
    if (pr.w < 0.5) continue;
    vec3 L = uLightPos[i];
    vec3 d = L - vWorld;
    float dist = length(d);
    vec3 dirL = d / dist;
    float cosA = dot(dirL, -uLightAim[i]);
    float cone = smoothstep(pr.y, pr.z, cosA);   // 光斑形状: 锥角+软化边缘
    float att = pr.x * 4500.0 / (dist * dist + 0.05);
    float lam = max(dot(N, dirL), 0.0);
    float vis = visibility(vWorld, L);
    irr += uLightColor[i] * (att * cone * lam * vis);  // 多灯重叠处 RGB 直接叠色
  }
  vec3 c = uAlbedo * irr;
  c = vec3(1.0) - exp(-c * 0.0022);   // 曝光映射
  c = pow(c, vec3(1.0 / 2.2));
  fragColor = vec4(c, 1.0);
}
`;

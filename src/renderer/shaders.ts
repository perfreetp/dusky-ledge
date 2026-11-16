// ===== WebGL2 着色器源码 =====

// 蒙皮网格：支持权重可视化、未刷满标红、穿地标红
export const MESH_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 aWeight;
layout(location=3) in ivec4 aBoneIdx;

uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat4 uBones[48];
uniform bool uSkinned;

out vec3 vNormal;
out vec3 vWorldPos;
out vec4 vWeight;
flat out ivec4 vBoneIdx;
out float vWeightSum;

void main() {
  vWeight = aWeight;
  vBoneIdx = aBoneIdx;
  vWeightSum = aWeight.x + aWeight.y + aWeight.z + aWeight.w;
  mat4 skin = mat4(1.0);
  if (uSkinned) {
    skin =
      aWeight.x * uBones[max(aBoneIdx.x, 0)] +
      aWeight.y * uBones[max(aBoneIdx.y, 0)] +
      aWeight.z * uBones[max(aBoneIdx.z, 0)] +
      aWeight.w * uBones[max(aBoneIdx.w, 0)];
  }
  vec4 world = uModel * skin * vec4(aPos, 1.0);
  vWorldPos = world.xyz;
  vNormal = mat3(uModel) * mat3(skin) * aNormal;
  gl_Position = uViewProj * world;
}`;

export const MESH_FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vWorldPos;
in vec4 vWeight;
flat in ivec4 vBoneIdx;
in float vWeightSum;

uniform vec3 uBoneColors[48];
uniform vec3 uBaseColor;
uniform bool uWeightMode;     // 按骨骼颜色显示影响范围
uniform bool uShowUnpainted;  // 未刷满顶点标红
uniform bool uShowPenetration;
uniform float uGroundY;
uniform vec3 uCameraPos;

out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(vec3(0.5, 1.0, 0.4));
  float diff = max(dot(N, L), 0.0) * 0.65 + 0.45;
  vec3 color = uBaseColor * diff;

  if (uWeightMode) {
    vec3 wc = vec3(0.0);
    float total = max(vWeightSum, 0.0001);
    for (int i = 0; i < 4; i++) {
      int bi = vBoneIdx[i];
      float w = vWeight[i];
      if (bi >= 0 && w > 0.0) wc += uBoneColors[bi] * (w / total);
    }
    color = wc * (0.55 + 0.45 * diff);
  }

  // 穿地检测：顶点低于地面 → 红色调
  if (uShowPenetration && vWorldPos.y < uGroundY) {
    float depth = clamp((uGroundY - vWorldPos.y) * 4.0, 0.0, 1.0);
    color = mix(color, vec3(1.0, 0.05, 0.05), 0.55 + 0.45 * depth);
  }

  // 权重未刷满 → 标红（优先级最高，便于一眼定位）
  if (uShowUnpainted && abs(vWeightSum - 1.0) > 0.01) {
    color = vec3(1.0, 0.0, 0.0);
  }
  outColor = vec4(color, 1.0);
}`;

// 通用纯色着色：骨骼、Gizmo、地面网格
export const BASIC_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
uniform mat4 uViewProj;
uniform mat4 uModel;
void main() { gl_Position = uViewProj * uModel * vec4(aPos, 1.0); }`;

export const BASIC_FS = `#version 300 es
precision highp float;
uniform vec4 uColor;
out vec4 outColor;
void main() { outColor = uColor; }`;

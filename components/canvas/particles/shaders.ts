import { hashGLSL, simplexGLSL } from '../glsl'
import { LANE_LOOP, LANE_SLICES, LANE_W, LANE_Z0, laneProcGLSL } from '@/lib/procs'

/**
 * Parçacık simülasyonu (GPGPU). Her parçacığın konumu ve hızı bir dokunun bir pikselidir.
 * Her karede iki "formasyon" arasındaki hedefe yay-sönümleyici ile çekilir; formasyonlar
 * sahnedeki yerlere karşılık gelir: kart izleri, şehir yolları, zamanlayıcı şeritleri, dalga
 * formları, arazi... Formasyon değişince parçacıklar uçarak yeni yerine gider.
 */

export const FORM = {
  DORMANT: 0,
  BOARD: 1,
  CLOCK: 2,
  LOGO: 3,
  DIVE: 4,
  CITY: 5,
  LANES: 6,
  WAVES: 7,
  TERRAIN: 8,
  DUST: 9,
  COLLAPSE: 10,
  /** kesmeden sonra: parçacık olduğu yerden yeni hedefe süzülür */
  FREE: 11,
} as const
export type FormId = (typeof FORM)[keyof typeof FORM]

export const simVertex = /* glsl */ `
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const simFragment = /* glsl */ `
precision highp float;
precision highp int;
in vec2 vUv;
layout(location = 0) out vec4 oPos;
layout(location = 1) out vec4 oVel;

uniform sampler2D uPos;
uniform sampler2D uVel;
uniform sampler2D uSeed;
uniform sampler2D uInitTex;
uniform sampler2D uBoardA;
uniform sampler2D uBoardB;
uniform sampler2D uCityA;
uniform sampler2D uCityB;
uniform sampler2D uLogo;
uniform sampler2D uTerrain;

uniform float uInit;
uniform float uTime;
uniform float uDt;
uniform int uFormA;
uniform int uFormB;
uniform float uMix;
uniform float uStagger;
uniform float uStiff;
uniform float uDamp;
uniform float uTurb;
uniform float uCurl;
uniform float uCurlScale;
uniform float uTeleport;
uniform mat4 uCut;

uniform vec3 uAnchor;
uniform vec3 uDie;
uniform vec2 uDieSize;
uniform vec3 uXtal;
uniform float uClockSquare;
uniform vec3 uCamPos;
uniform float uDustR;
uniform float uFlowSpeed;
uniform float uLaneSpeed;
uniform int uLaneHi;
uniform float uLaneHiAmt;
uniform vec2 uChan[8];
uniform float uChanZ[8];
uniform float uWaveSpeed;
uniform float uCursorX;

uniform vec3 uRayO;
uniform vec3 uRayD;
uniform float uMouse;
uniform float uMouseR;

${hashGLSL}
${simplexGLSL}
${laneProcGLSL}

const float PI = 3.14159265;

// Her formasyon: xyz = hedef, w = parlaklık (negatifse sıcak renk). size = dünya birimiyle boyut.
vec4 form(int id, vec2 uv, vec4 S, out float size) {
  if (id == 0) {
    size = 0.012;
    return vec4(uAnchor + (S.xyz - 0.5) * 0.03, 0.0);
  }
  if (id == 1) {
    vec4 a = texture(uBoardA, uv);
    vec4 b = texture(uBoardB, uv);
    float ph = fract(S.y + uTime * a.w * uFlowSpeed);
    size = 0.034;
    return vec4(mix(a.xyz, b.xyz, ph), b.w * sin(PI * ph));
  }
  if (id == 2) {
    float x = (S.x - 0.5) * 3.4;
    float w = sin(x * 6.2 - uTime * 3.0);
    float sq = tanh(w * mix(1.0, 14.0, uClockSquare)) / tanh(mix(1.0, 14.0, uClockSquare));
    vec3 p = uXtal + vec3(x, 0.95 + sq * 0.26, (S.z - 0.5) * 0.05);
    p.y += (S.w - 0.5) * 0.03;
    size = 0.026;
    return vec4(p, 1.25 * smoothstep(1.7, 1.2, abs(x)));
  }
  if (id == 3) {
    vec4 t = texture(uLogo, uv);
    size = 0.024;
    return vec4(t.xyz + (S.xyz - 0.5) * 0.01, t.w * 0.2);
  }
  if (id == 4) {
    vec3 p = uDie + vec3((S.x - 0.5) * uDieSize.x, 0.012, (S.y - 0.5) * uDieSize.y);
    size = 0.012;
    return vec4(p, 0.9);
  }
  if (id == 5) {
    vec4 a = texture(uCityA, uv);
    vec4 b = texture(uCityB, uv);
    float ph = fract(S.y + uTime * a.w * uFlowSpeed);
    float warm = b.w > 5.0 ? -1.0 : 1.0;
    float br = (b.w > 5.0 ? b.w - 10.0 : b.w) * smoothstep(0.0, 0.08, ph) * smoothstep(1.0, 0.92, ph);
    size = 0.06;
    return vec4(mix(a.xyz, b.xyz, ph), br * warm);
  }
  if (id == 6) {
    // Şerit ayraçları boyunca akan veri: dilim geçtikçe yanındaki ayraç nabız gibi parlar
    float b = floor(S.x * 9.0);
    float lane = clamp(b - step(0.5, S.z), 0.0, 7.0);
    float x = (b - 4.0) * ${LANE_W.toFixed(2)} + (S.z - 0.5) * 0.09;
    float ph = fract(S.y - uTime * uLaneSpeed);
    float z = ${LANE_Z0.toFixed(1)} - ph * ${LANE_LOOP.toFixed(1)};
    float k = floor(S.y * ${LANE_SLICES.toFixed(1)});
    float within = fract(S.y * ${LANE_SLICES.toFixed(1)});
    float L = laneLen(lane, k);
    float on = smoothstep(0.06, 0.12, within) * smoothstep(0.12 + 0.74 * L, 0.06 + 0.74 * L, within) * step(0.01, L);
    float hi = (uLaneHi >= 0 && laneProc(lane, k) == uLaneHi) ? uLaneHiAmt : 0.0;
    size = 0.04;
    return vec4(x, 0.03 + S.w * 0.06, z, (0.07 + on * 0.3) * (1.0 + hi * 3.0));
  }
  if (id == 7) {
    int c = int(floor(S.x * 7.0));
    float x = mix(-62.0, 62.0, fract(S.y + uTime * uWaveSpeed));
    float level;
    if (c == 0) {
      level = step(0.5, fract(x * 0.62));
    } else {
      vec2 r = uChan[c];
      level = step(r.x, x) * step(x, r.y);
    }
    float y = level * 1.2 + (S.w - 0.5) * 0.04;
    float near = exp(-pow((x - uCursorX) * 0.09, 2.0));
    size = 0.05;
    float past = mix(0.25, 1.0, step(x, uCursorX + 0.3));
    return vec4(x, y, uChanZ[c] + (S.z - 0.5) * 0.08, (0.1 + level * 0.9) * (0.7 + near * 1.0) * past * (c == 0 ? 0.5 : 1.0));
  }
  if (id == 8) {
    vec4 t = texture(uTerrain, uv);
    size = 0.045;
    return vec4(t.xyz, t.w);
  }
  if (id == 9) {
    vec3 dir = normalize(S.xyz * 2.0 - 1.0 + 1e-4);
    float r = uDustR * (0.35 + S.w * 1.1);
    size = uDustR * 0.012;
    return vec4(uCamPos + dir * r, 0.55);
  }
  // 10: çöküş (CRT kapanışı gibi her şey tek noktaya)
  size = 0.02;
  return vec4(uAnchor + (S.xyz - 0.5) * 0.004, 1.4);
}

void main() {
  vec4 P = texture(uPos, vUv);
  vec4 V = texture(uVel, vUv);
  vec4 S = texture(uSeed, vUv);
  if (uInit > 0.5) {
    vec4 I = texture(uInitTex, vUv);
    oPos = vec4(I.xyz, 0.0);
    oVel = vec4(0.0, 0.0, 0.0, 0.012);
    return;
  }
  vec3 pos = (uCut * vec4(P.xyz, 1.0)).xyz;
  vec3 vel = mat3(uCut) * V.xyz;

  float sA;
  float sB;
  vec4 A = uFormA == 11 ? vec4(pos, P.w) : form(uFormA, vUv, S, sA);
  if (uFormA == 11) sA = V.w;
  vec4 B = form(uFormB, vUv, S, sB);
  float k = clamp((uMix - S.w * uStagger) / max(1.0 - uStagger, 0.0001), 0.0, 1.0);
  k = k * k * (3.0 - 2.0 * k);
  vec3 target = mix(A.xyz, B.xyz, k);
  float bright = mix(A.w, B.w, k);
  float size = mix(sA, sB, k);

  vec3 toT = target - pos;
  float d = length(toT);
  if (d > uTeleport && (k <= 0.0 || k >= 1.0)) {
    pos = target;
    vel = vec3(0.0);
    toT = vec3(0.0);
  }
  vec3 acc = toT * uStiff - vel * uDamp;
  float ph = S.x * 6.283 + uTime * 0.6;
  acc += vec3(sin(pos.y * 1.7 + ph), sin(pos.z * 1.3 + ph * 1.3), sin(pos.x * 1.9 + ph * 0.7)) * uTurb;
  if (uCurl > 0.0) acc += curlNoise(pos * uCurlScale + uTime * 0.07) * uCurl * (0.4 + S.z);

  vec3 rel = pos - uRayO;
  float t = max(dot(rel, uRayD), 0.0);
  vec3 away = pos - (uRayO + uRayD * t);
  float dm = length(away);
  acc += (away / max(dm, 1e-4)) * uMouse * exp(-(dm * dm) / (uMouseR * uMouseR));

  vel += acc * uDt;
  pos += vel * uDt;
  oPos = vec4(pos, bright);
  oVel = vec4(vel, mix(V.w, size, 1.0 - exp(-uDt * 6.0)));
}
`

export const pointsVertex = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform sampler2D uSeed;
uniform float uN;
uniform float uScale;
uniform float uSizeMul;
uniform float uFogDensity;
uniform float uBright;
varying float vB;
varying float vWarm;

void main() {
  int id = gl_VertexID;
  int n = int(uN);
  ivec2 tc = ivec2(id - (id / n) * n, id / n);
  vec4 P = texelFetch(uPos, tc, 0);
  vec4 V = texelFetch(uVel, tc, 0);
  vec4 S = texelFetch(uSeed, tc, 0);
  vec4 mv = modelViewMatrix * vec4(P.xyz, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = V.w * uSizeMul * (0.55 + 0.9 * S.x * S.x);
  float px = size * uScale / max(-mv.z, 0.0001);
  float pc = clamp(px, 1.2, 48.0);
  gl_PointSize = pc;
  float area = (px * px) / (pc * pc);
  float fog = exp(-(-mv.z) * uFogDensity);
  vB = abs(P.w) * uBright * clamp(area, 0.04, 1.0) * fog * (0.65 + 0.7 * S.y);
  vWarm = P.w < 0.0 ? 1.0 : 0.0;
  if (vB < 0.003) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`

export const pointsFragment = /* glsl */ `
uniform vec3 uCold;
uniform vec3 uWarm;
varying float vB;
varying float vWarm;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = dot(c, c) * 4.0;
  if (r > 1.0) discard;
  float a = 1.0 - r;
  a *= a;
  gl_FragColor = vec4(mix(uCold, uWarm, vWarm) * vB * a, 1.0);
}
`

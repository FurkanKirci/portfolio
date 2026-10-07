import { procs } from './content'

/**
 * Zamanlayıcı şeritlerinde her dilim 7 "süreç sınıfından" birine aittir.
 * Tablodaki bir sürecin üzerine gelince o sınıfın dilimleri parlar.
 */
const ORDER = [2611, 2612, 2613, 2408, 1874, 2677, 2610]

export function laneClassOf(pid: number) {
  const i = ORDER.indexOf(pid)
  if (i >= 0) return i
  const p = procs.find((x) => x.pid === pid)
  if (p?.parent && ORDER.includes(p.parent)) return ORDER.indexOf(p.parent)
  return pid % 7
}

/** GLSL tarafıyla aynı formül: şerit + dilim indeksinden süreç sınıfı. */
export const LANE_SLICES = 24
export const LANE_LOOP = 230
export const LANE_Z0 = 18
export const LANE_W = 2.2
export const laneProcGLSL = /* glsl */ `
int laneProc(float lane, float k) {
  return int(mod(k * 5.0 + lane * 3.0 + floor(k / 3.0) * 2.0, 7.0));
}
// Dilim uzunluğu (0 = çekirdek boşta). Gerçek bir zamanlayıcı gibi düzensiz.
float laneLen(float lane, float k) {
  float h = fract(sin(dot(vec2(lane, k), vec2(12.9898, 78.233))) * 43758.5453);
  return h < 0.18 ? 0.0 : 0.28 + 0.72 * fract(h * 7.31);
}
`

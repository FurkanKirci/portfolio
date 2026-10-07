import * as THREE from 'three'

/**
 * Bütün özel shader'ların paylaştığı uniform nesneleri.
 * Aynı nesne referansı birden fazla malzemeye verildiği için tek bir atama hepsini günceller.
 */
export const shared = {
  uTime: { value: 0 },
  uFogColor: { value: new THREE.Color('#081020') },
  uFogDensity: { value: 0.012 },
  uFogHeightFalloff: { value: 0.08 },
  uFogBase: { value: 0 },
  uPixelRatio: { value: 1 },
}

export type WorldId = 'board' | 'city' | 'sched' | 'analyzer' | 'terrain'

/** Her dünyanın görünürlüğü (0 → sisin içinde kaybolmuş, 1 → tam görünür). */
export const presence: Record<WorldId, { value: number }> = {
  board: { value: 1 },
  city: { value: 0 },
  sched: { value: 0 },
  analyzer: { value: 0 },
  terrain: { value: 0 },
}

export const palette = {
  bg: new THREE.Color('#05070b'),
  ice: new THREE.Color('#7fd6ff'),
  iceDeep: new THREE.Color('#3a86c8'),
  white: new THREE.Color('#e9f4ff'),
  heat: new THREE.Color('#ff9a5c'),
}

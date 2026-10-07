'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { LANE_LOOP, LANE_SLICES, LANE_W, LANE_Z0, laneProcGLSL } from '@/lib/procs'
import { fogGLSL, hashGLSL } from '../glsl'
import { particleState } from '../particles/Particles'
import { presence, shared } from '../uniforms'

/**
 * İşlemci zamanlayıcısı: sekiz çekirdek şeridi, her şeritte süreçlere ayrılan zaman dilimleri
 * kameraya doğru akar. Tablodaki bir süreç seçilince o sürecin dilimleri parlar.
 */

const LANES = 8

const common = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform int uHi;
uniform float uHiAmt;
${laneProcGLSL}
float laneX(float lane) { return (lane - 3.5) * ${LANE_W.toFixed(2)}; }
`

const SW = LANE_W * 0.56
const SL = (LANE_LOOP / LANE_SLICES) * 0.74

const slabVertex = /* glsl */ `
${common}
attribute vec2 aSlot;
varying vec3 vWorld;
varying float vBright;
varying float vHi;
varying vec3 vLocal;
varying float vLen;
void main() {
  float lane = aSlot.x;
  float k = aSlot.y;
  float L = laneLen(lane, k);
  // dilimin önü (kameraya bakan ucu) sabit, kuyruğu uzunluğa göre uzar
  float u = fract((k + 0.1 + 0.37 * L) / ${LANE_SLICES.toFixed(1)} - uTime * uSpeed);
  float z = ${LANE_Z0.toFixed(1)} - u * ${LANE_LOOP.toFixed(1)};
  vec3 p = position * vec3(${SW.toFixed(3)}, 1.0, ${SL.toFixed(3)} * L);
  p += vec3(laneX(lane), 0.025, z);
  int proc = laneProc(lane, k);
  float hi = (uHi >= 0 && proc == uHi) ? uHiAmt : 0.0;
  vBright = (0.42 + float(proc) * 0.08) * (1.0 + hi * 3.5);
  vHi = hi;
  vLocal = position;
  vLen = L;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  gl_Position = L < 0.01 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * viewMatrix * w;
}
`

/** Dilim: uzun pozlamada çekilmiş bir far izi gibi; parlak baş, sönerek uzayan kuyruk. */
const slabFragment = /* glsl */ `
uniform float uPresence;
uniform vec3 uCold;
uniform vec3 uHot;
varying vec3 vWorld;
varying float vBright;
varying float vHi;
varying vec3 vLocal;
varying float vLen;
${fogGLSL}
void main() {
  float along = vLocal.z + 0.5;
  float lat = abs(vLocal.x) * 2.0;
  float distHead = (1.0 - along) * ${SL.toFixed(3)} * vLen;
  float body = 1.0 - smoothstep(0.5, 1.0, lat);
  float core = exp(-lat * lat * 14.0);
  float rail = smoothstep(0.7, 0.84, lat) * (1.0 - smoothstep(0.84, 0.97, lat));
  float trail = pow(along, 1.4);
  float headCap = exp(-distHead * distHead * 10.0);
  float headLine = exp(-distHead * distHead * 90.0);
  float I = trail * (body * 0.12 + core * 0.7 + rail * 0.26) + headCap * (body * 0.55 + core * 0.9) + headLine * body * 0.9;
  vec3 c = mix(uCold, uHot, vHi) * vBright * I;
  c *= 1.0 - fogFactor(vWorld, cameraPosition);
  gl_FragColor = vec4(c * uPresence, 1.0);
}
`

const groundFragment = /* glsl */ `
${common}
uniform float uPresence;
uniform vec3 uCold;
uniform vec3 uHot;
varying vec3 vWorld;
${fogGLSL}
${hashGLSL}
void main() {
  vec2 p = vWorld.xz;
  float laneF = p.x / ${LANE_W.toFixed(2)} + 4.0;
  float lane = floor(laneF);
  float inLanes = step(0.0, laneF) * step(laneF, ${LANES.toFixed(1)});
  float sep = 1.0 - smoothstep(0.0, 0.035, abs(fract(laneF) - 0.0) * ${LANE_W.toFixed(2)});
  sep = max(sep, 1.0 - smoothstep(0.0, 0.035, abs(fract(laneF) - 1.0) * ${LANE_W.toFixed(2)}));
  vec3 col = vec3(0.012, 0.016, 0.026);
  col += vec3(0.06, 0.12, 0.2) * sep * inLanes * 0.32;
  // zaman çizgileri: kameraya doğru akan ince ızgara
  float tick = fract((p.y - uTime * uSpeed * ${LANE_LOOP.toFixed(1)}) / 10.0);
  col += vec3(0.03, 0.06, 0.1) * (1.0 - smoothstep(0.0, 0.012, tick)) * inLanes;
  // dilimlerin zemindeki yansıması (aynı formülle hesaplanır)
  float u = (${LANE_Z0.toFixed(1)} - p.y) / ${LANE_LOOP.toFixed(1)};
  if (u > 0.0 && u < 1.0 && inLanes > 0.5) {
    float ph = fract(u + uTime * uSpeed);
    float k = floor(ph * ${LANE_SLICES.toFixed(1)});
    float within = fract(ph * ${LANE_SLICES.toFixed(1)});
    float L = laneLen(lane, k);
    float on = smoothstep(0.0, 0.02, within - 0.1) * smoothstep(0.0, 0.02, 0.1 + 0.74 * L - within);
    int proc = laneProc(lane, k);
    float hi = (uHi >= 0 && proc == uHi) ? uHiAmt : 0.0;
    float cx = abs(fract(laneF) - 0.5) * 2.0;
    float glow = on * (1.0 - cx * cx) * (0.32 + float(proc) * 0.07) * (1.0 + hi * 3.0);
    col += mix(uCold, uHot, hi) * glow * 0.11;
  }
  float f = fogFactor(vWorld, cameraPosition);
  col = mix(col, uFogColor, f);
  col = mix(uFogColor, col, uPresence);
  gl_FragColor = vec4(col, 1.0);
}
`

export function Scheduler() {
  const world = useMemo(() => {
    const group = new THREE.Group()
    group.name = 'sched'
    const uniforms = {
      uTime: shared.uTime,
      uSpeed: { value: 0.035 },
      uHi: { value: -1 },
      uHiAmt: { value: 0 },
      uPresence: presence.sched,
      uCold: { value: new THREE.Color('#8fdcff').multiplyScalar(1.5) },
      uHot: { value: new THREE.Color('#f2fbff').multiplyScalar(2.2) },
      uFogColor: shared.uFogColor,
      uFogDensity: shared.uFogDensity,
      uFogHeightFalloff: shared.uFogHeightFalloff,
      uFogBase: shared.uFogBase,
    }

    const n = LANES * LANE_SLICES
    const geo = new THREE.InstancedBufferGeometry()
    const box = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
    geo.index = box.index
    geo.attributes.position = box.attributes.position
    const slots = new Float32Array(n * 2)
    for (let l = 0; l < LANES; l++) for (let k = 0; k < LANE_SLICES; k++) slots.set([l, k], (l * LANE_SLICES + k) * 2)
    geo.setAttribute('aSlot', new THREE.InstancedBufferAttribute(slots, 2))
    geo.instanceCount = n
    const slabMat = new THREE.ShaderMaterial({
      vertexShader: slabVertex,
      fragmentShader: slabFragment,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const slabs = new THREE.Mesh(geo, slabMat)
    slabs.frustumCulled = false
    group.add(slabs)

    const groundMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: groundFragment,
      uniforms,
    })
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 320).rotateX(-Math.PI / 2).translate(0, 0, -100), groundMat)
    group.add(ground)

    return {
      group,
      uniforms,
      dispose: () => {
        geo.dispose()
        box.dispose()
        slabMat.dispose()
        groundMat.dispose()
        ground.geometry.dispose()
      },
    }
  }, [])

  useEffect(() => () => world.dispose(), [world])

  useFrame(() => {
    const p = presence.sched.value
    world.group.visible = p > 0.002
    if (!world.group.visible) return
    world.uniforms.uSpeed.value = particleState.laneSpeed
    world.uniforms.uHi.value = particleState.laneHi
    world.uniforms.uHiAmt.value = particleState.laneHiAmt
  })

  return <primitive object={world.group} />
}

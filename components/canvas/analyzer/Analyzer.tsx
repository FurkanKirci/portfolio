'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { channels, timeline } from '@/lib/content'
import { fogGLSL } from '../glsl'
import { particleState } from '../particles/Particles'
import { presence, shared } from '../uniforms'
import { AN, CHANNEL_EXTENT, CHANNEL_GAP, CHANNEL_Z, YEAR_Z, analyzerX } from './geometry'

/**
 * Mantık analizörü: her kanal bir hayat dönemi. Dönem sürerken sinyal "yüksek"tedir; altında ışıktan bir perde.
 * En üstte CLK kanalı: açılışta başlayan saat sinyali burada da atmaya devam eder.
 */

const lineVertex = /* glsl */ `
attribute float aLevel;
attribute float aChan;
varying vec3 vWorld;
varying float vLevel;
varying float vChan;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vLevel = aLevel;
  vChan = aChan;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const lineFragment = /* glsl */ `
uniform float uPresence;
uniform float uCursor;
uniform vec3 uColor;
uniform vec3 uHot;
uniform float uActive[8];
varying vec3 vWorld;
varying float vLevel;
varying float vChan;
${fogGLSL}
void main() {
  int ci = int(vChan + 0.5);
  float near = exp(-pow((vWorld.x - uCursor) * 0.12, 2.0));
  float past = smoothstep(uCursor + 0.6, uCursor - 0.6, vWorld.x);
  float act = uActive[ci];
  float clk = ci == 0 ? 0.4 : 1.0;
  float level = mix(0.2, 1.0, vLevel);
  vec3 c = uColor * level * mix(0.22, 1.0, past) * clk * (1.0 + near * 1.0 + act * vLevel * 0.4);
  c = mix(c, uHot, near * vLevel * past * 0.25);
  float f = fogFactor(vWorld, cameraPosition);
  c = mix(c, uFogColor, f);
  c = mix(uFogColor, c, uPresence);
  gl_FragColor = vec4(c, 1.0);
}
`

const curtainFragment = /* glsl */ `
uniform float uPresence;
uniform float uCursor;
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  float a = pow(vUv.y, 4.0) * 0.1 + pow(vUv.y, 40.0) * 0.22;
  float near = exp(-pow((vWorld.x - uCursor) * 0.08, 2.0));
  float past = mix(0.08, 1.0, smoothstep(uCursor + 0.6, uCursor - 0.6, vWorld.x));
  gl_FragColor = vec4(uColor * a * past * (1.0 + near * 1.4) * uPresence, 1.0);
}
`

const groundFragment = /* glsl */ `
uniform float uPresence;
uniform float uCursor;
uniform float uYear0;
uniform float uUnitsPerYear;
varying vec3 vWorld;
${fogGLSL}
float line(float v, float w) { float fw = fwidth(v); return 1.0 - smoothstep(w, w + fw * 1.5, abs(v)); }
void main() {
  vec2 p = vWorld.xz;
  vec3 col = vec3(0.01, 0.014, 0.022);
  // yıl çizgileri ve ay işaretleri
  float yr = (p.x - ${AN.x0.toFixed(1)}) / uUnitsPerYear;
  float band = step(-${CHANNEL_EXTENT.toFixed(2)}, p.y) * step(p.y, ${CHANNEL_EXTENT.toFixed(2)});
  col += vec3(0.035, 0.065, 0.1) * line(fract(yr + 0.5) - 0.5, 0.004) * band;
  col += vec3(0.025, 0.045, 0.07) * line(fract(yr * 12.0 + 0.5) - 0.5, 0.012) * step(${(YEAR_Z + 0.2).toFixed(2)}, p.y) * step(p.y, ${(-CHANNEL_EXTENT - 0.2).toFixed(2)});
  // kanal ızgarası: yalnızca kanalların altında ince çizgi
  col += vec3(0.012, 0.022, 0.035) * line(fract(p.y / ${CHANNEL_GAP.toFixed(2)} + 0.5) - 0.5, 0.004) * band;
  // imleç: yerde ince bir ışık çizgisi ve etrafına yayılan aydınlık; geçmiş biraz daha aydınlık
  float cx = p.x - uCursor;
  col += vec3(0.1, 0.2, 0.3) * exp(-cx * cx * 0.12) * 0.16 * band;
  col += vec3(0.6, 0.85, 1.0) * line(cx, 0.025) * band * 1.1;
  col += vec3(0.006, 0.011, 0.018) * smoothstep(0.5, -0.5, cx) * band;
  float f = fogFactor(vWorld, cameraPosition);
  col = mix(col, uFogColor, f);
  col = mix(uFogColor, col, uPresence);
  gl_FragColor = vec4(col, 1.0);
}
`

const cursorFragment = /* glsl */ `
uniform float uPresence;
varying vec2 vUv;
void main() {
  float e = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
  float v = (1.0 - vUv.y) * (1.0 - vUv.y);
  gl_FragColor = vec4(vec3(0.62, 0.86, 1.0) * v * 0.06 * e * uPresence, 1.0);
}
`

interface Seg {
  x0: number
  x1: number
  level: number
}

function waveform(from: number, to: number | null): Seg[] {
  const a = analyzerX(from)
  const b = to === null ? AN.x1 + 6 : analyzerX(to)
  const segs: Seg[] = []
  if (a > AN.x0 - 6) segs.push({ x0: AN.x0 - 6, x1: a, level: 0 })
  segs.push({ x0: Math.max(a, AN.x0 - 6), x1: b, level: 1 })
  if (b < AN.x1 + 6) segs.push({ x0: b, x1: AN.x1 + 6, level: 0 })
  return segs
}

function clockSegments(): Seg[] {
  const segs: Seg[] = []
  const period = 1.6
  for (let x = AN.x0 - 6, i = 0; x < AN.x1 + 6; x += period / 2, i++) segs.push({ x0: x, x1: x + period / 2, level: i % 2 })
  return segs
}

export function Analyzer() {
  const world = useMemo(() => {
    const group = new THREE.Group()
    group.name = 'analyzer'
    const t = 0.09
    const pos: number[] = []
    const lvl: number[] = []
    const chan: number[] = []
    const idx: number[] = []
    const curtainPos: number[] = []
    const curtainUv: number[] = []
    const curtainIdx: number[] = []

    // Bir kutu (dikdörtgen prizma) ekle
    const addBox = (x0: number, x1: number, y0: number, y1: number, z: number, level: number, c: number) => {
      const base = pos.length / 3
      const zs = [z - t / 2, z + t / 2]
      for (const zz of zs)
        for (const [x, y] of [
          [x0, y0],
          [x1, y0],
          [x1, y1],
          [x0, y1],
        ]) {
          pos.push(x, y, zz)
          lvl.push(level)
          chan.push(c)
        }
      const f = [
        [0, 1, 2, 0, 2, 3],
        [5, 4, 7, 5, 7, 6],
        [3, 2, 6, 3, 6, 7],
        [4, 5, 1, 4, 1, 0],
        [4, 0, 3, 4, 3, 7],
        [1, 5, 6, 1, 6, 2],
      ]
      for (const tri of f) for (const k of tri) idx.push(base + k)
    }
    const addCurtain = (x0: number, x1: number, h: number, z: number) => {
      const base = curtainPos.length / 3
      curtainPos.push(x0, 0, z, x1, 0, z, x1, h, z, x0, h, z)
      curtainUv.push(0, 0, 1, 0, 1, 1, 0, 1)
      curtainIdx.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }

    const all: { segs: Seg[]; z: number }[] = [{ segs: clockSegments(), z: CHANNEL_Z[0] }]
    channels.forEach((c, i) => all.push({ segs: waveform(c.from, c.to), z: CHANNEL_Z[i + 1] }))
    all.forEach(({ segs, z }, ci) => {
      const H = ci === 0 ? AN.high * 0.6 : AN.high
      segs.forEach((s, k) => {
        const y = s.level * H
        addBox(s.x0, s.x1, y - t / 2, y + t / 2, z, s.level, ci)
        const next = segs[k + 1]
        if (next && next.level !== s.level) addBox(s.x1 - t / 2, s.x1 + t / 2, -t / 2, H + t / 2, z, 1, ci)
        if (s.level === 1 && ci > 0) addCurtain(s.x0, s.x1, H, z - 0.001)
      })
    })

    const uniforms = {
      uPresence: presence.analyzer,
      uCursor: { value: 0 },
      uColor: { value: new THREE.Color('#8fdcff').multiplyScalar(1.4) },
      uHot: { value: new THREE.Color('#ffffff').multiplyScalar(2.0) },
      uActive: { value: new Float32Array(8) },
      uYear0: { value: timeline.start },
      uUnitsPerYear: { value: (AN.x1 - AN.x0) / (timeline.end - timeline.start) },
      uFogColor: shared.uFogColor,
      uFogDensity: shared.uFogDensity,
      uFogHeightFalloff: shared.uFogHeightFalloff,
      uFogBase: shared.uFogBase,
    }

    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    lineGeo.setAttribute('aLevel', new THREE.Float32BufferAttribute(lvl, 1))
    lineGeo.setAttribute('aChan', new THREE.Float32BufferAttribute(chan, 1))
    lineGeo.setIndex(idx)
    const lineMat = new THREE.ShaderMaterial({ vertexShader: lineVertex, fragmentShader: lineFragment, uniforms, side: THREE.DoubleSide })
    group.add(new THREE.Mesh(lineGeo, lineMat))

    const curtainGeo = new THREE.BufferGeometry()
    curtainGeo.setAttribute('position', new THREE.Float32BufferAttribute(curtainPos, 3))
    curtainGeo.setAttribute('uv', new THREE.Float32BufferAttribute(curtainUv, 2))
    curtainGeo.setIndex(curtainIdx)
    const curtainMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vWorld; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: curtainFragment,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    group.add(new THREE.Mesh(curtainGeo, curtainMat))

    const groundMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: groundFragment,
      uniforms,
    })
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 120).rotateX(-Math.PI / 2).translate(0, -0.05, 0), groundMat)
    group.add(ground)

    const cursorMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: cursorFragment,
      uniforms: { uPresence: presence.analyzer },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const cursorWall = new THREE.Mesh(new THREE.PlaneGeometry(CHANNEL_EXTENT * 2 + 1.5, 3.2).rotateY(Math.PI / 2).translate(0, 1.6, 0), cursorMat)
    group.add(cursorWall)

    return {
      group,
      uniforms,
      cursorWall,
      dispose: () => {
        lineGeo.dispose()
        lineMat.dispose()
        curtainGeo.dispose()
        curtainMat.dispose()
        groundMat.dispose()
        ground.geometry.dispose()
        cursorMat.dispose()
        cursorWall.geometry.dispose()
      },
    }
  }, [])

  useEffect(() => () => world.dispose(), [world])

  useFrame(() => {
    const p = presence.analyzer.value
    world.group.visible = p > 0.002
    if (!world.group.visible) return
    const cx = particleState.cursorX
    world.uniforms.uCursor.value = cx
    world.cursorWall.position.x = cx
    const act = world.uniforms.uActive.value as Float32Array
    channels.forEach((c, i) => {
      const a = analyzerX(c.from)
      const b = c.to === null ? 1e9 : analyzerX(c.to)
      act[i + 1] = cx >= a && cx <= b ? 1 : 0
    })
    act[0] = 1
  })

  return <primitive object={world.group} />
}

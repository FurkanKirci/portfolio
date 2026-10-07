'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { hops } from '@/lib/content'
import { activeHop, flightT } from '@/lib/film'
import { frame, useApp } from '@/lib/store'
import { fogGLSL } from '../glsl'
import { presence, shared } from '../uniforms'
import { MAP, MAP_D, MAP_W, heightAt, loadTerrain, lonLatToXZ, sample, type TerrainData } from './data'

/**
 * Türkiye: gerçek yükselti verisinden kabartma, eş-yükselti çizgileri ve hayat rotası.
 * Atlamalar ışık sütunlarıyla işaretlenir; aralarındaki yaylarda paketler akar.
 */

const terrainVertex = /* glsl */ `
uniform sampler2D uMap;
uniform float uHeight;
varying vec2 vUv;
varying vec3 vWorld;
float insideMap(vec2 t) {
  return smoothstep(-0.004, 0.02, t.x) * smoothstep(1.004, 0.98, t.x) * smoothstep(-0.004, 0.02, t.y) * smoothstep(1.004, 0.98, t.y);
}
void main() {
  vUv = uv;
  vec3 p = position;
  vec2 tuv = vec2(uv.x, 1.0 - uv.y);
  float h = texture2D(uMap, tuv).r * insideMap(tuv);
  p.y += h * uHeight;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const terrainFragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uHeight;
uniform vec2 uTexel;
uniform float uPresence;
uniform float uTime;
varying vec2 vUv;
varying vec3 vWorld;
${fogGLSL}
void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec4 m = texture2D(uMap, uv);
  // veri sınırının dışı düz deniz: kenar pikselleri dışarı doğru uzamasın
  float inside = smoothstep(-0.004, 0.02, uv.x) * smoothstep(1.004, 0.98, uv.x) * smoothstep(-0.004, 0.02, uv.y) * smoothstep(1.004, 0.98, uv.y);
  m.rgb *= inside;
  // normaller 2 doku pikseli aralıkla: 8 bit yükseklik verisinin basamakları yakın planda buruşuk görünmesin
  vec2 o = uTexel * 2.0;
  float hL = texture2D(uMap, uv - vec2(o.x, 0.0)).r;
  float hR = texture2D(uMap, uv + vec2(o.x, 0.0)).r;
  float hD = texture2D(uMap, uv - vec2(0.0, o.y)).r;
  float hU = texture2D(uMap, uv + vec2(0.0, o.y)).r;
  vec3 n = normalize(vec3((hL - hR) * uHeight / (o.x * ${MAP_W.toFixed(2)}), 2.0, (hU - hD) * uHeight / (o.y * ${MAP_D.toFixed(2)})));
  vec3 moon = normalize(vec3(-0.55, 0.62, -0.55));
  float diff = max(dot(n, moon), 0.0);
  float land = smoothstep(0.35, 0.65, m.b);
  float tr = smoothstep(0.35, 0.65, m.g);
  vec3 albedo = mix(vec3(0.008, 0.012, 0.02), vec3(0.018, 0.028, 0.045), tr);
  vec3 col = albedo * (0.28 + diff * 0.78) * land;
  // deniz: düz, karanlık, ay ışığının uzun yansıması
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 r = reflect(-moon, vec3(0.0, 1.0, 0.0));
  float ripple = sin(vWorld.x * 2.1 + uTime * 0.6) * sin(vWorld.z * 1.7 - uTime * 0.4) * 0.5 + 0.5;
  float spec = pow(max(dot(r, v), 0.0), 28.0) * (0.6 + 0.4 * ripple);
  vec3 sea = vec3(0.006, 0.01, 0.018) + vec3(0.35, 0.55, 0.8) * spec * 0.25;
  col = mix(sea, col, land);
  // yükseklere ince bir soğuk ışıma
  col += vec3(0.05, 0.1, 0.16) * smoothstep(0.35, 0.9, m.r) * tr * 0.5;
  float f = fogFactor(vWorld, cameraPosition);
  col = mix(col, uFogColor, f);
  // düzlemin kenarları arka plana erir: uzaktan bakınca sert bir levha kenarı görünmesin
  float ex = min(vUv.x + 0.3, 1.3 - vUv.x) / 0.3;
  float ey = min(vUv.y + 0.45, 1.45 - vUv.y) / 0.45;
  col = mix(uFogColor, col, smoothstep(0.0, 0.85, min(ex, ey)));
  col = mix(uFogColor, col, uPresence);
  gl_FragColor = vec4(col, 1.0);
}
`

const contourVertex = /* glsl */ `
attribute float aCode;
varying float vCode;
varying vec3 vWorld;
void main() {
  vCode = aCode;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const contourFragment = /* glsl */ `
uniform float uPresence;
uniform vec3 uColor;
varying float vCode;
varying vec3 vWorld;
${fogGLSL}
void main() {
  float k = vCode > 254.5 ? 1.0 : vCode > 253.5 ? 0.22 : 0.12 + vCode * 0.045;
  vec3 c = uColor * k * (vCode > 254.5 ? 2.0 : 1.0);
  float f = fogFactor(vWorld, cameraPosition);
  c *= (1.0 - f);
  gl_FragColor = vec4(c * uPresence, 1.0);
}
`

const glowFragment = /* glsl */ `
uniform float uPresence;
uniform float uTime;
uniform float uReveal;
uniform float uPacket;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float u = vUv.x;
  if (u > uReveal) discard;
  float across = abs(vUv.y - 0.5) * 2.0;
  float body = (1.0 - across) * 0.5;
  float pk = 0.0;
  for (int i = 0; i < 3; i++) {
    float h = fract(uTime * 0.22 * uPacket + float(i) / 3.0);
    pk += exp(-pow((u - h) * 40.0, 2.0)) * 2.5;
  }
  float head = exp(-pow((u - uReveal) * 30.0, 2.0)) * 3.0 * step(uReveal, 0.999);
  gl_FragColor = vec4(uColor * (body + pk * (1.0 - across) + head) * uPresence, 1.0);
}
`

const pillarFragment = /* glsl */ `
uniform float uPresence;
uniform float uOn;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float a = pow(1.0 - vUv.y, 2.0) * (0.25 + uOn * 0.9);
  gl_FragColor = vec4(uColor * a * uPresence, 1.0);
}
`

const ringFragment = /* glsl */ `
uniform float uPresence;
uniform float uOn;
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  float ring = exp(-pow((r - 0.55) * 18.0, 2.0)) * (0.4 + uOn);
  float ping = fract(uTime * 0.6);
  float wave = exp(-pow((r - ping) * 14.0, 2.0)) * (1.0 - ping) * uOn * 1.6;
  float dot0 = exp(-r * r * 60.0) * (0.8 + uOn * 1.5);
  gl_FragColor = vec4(uColor * (ring + wave + dot0) * uPresence, 1.0);
}
`

const uvVertex = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`

function hopPoint(t: TerrainData | null, i: number) {
  const h = hops[i]
  const [x, z] = lonLatToXZ(h.lon, h.lat)
  const u = x / MAP_W + 0.5
  const v = z / MAP_D + 0.5
  const y = t && !h.remote ? heightAt(t, u, v) + 0.06 : 0.6
  return new THREE.Vector3(x, y, z)
}

function build(t: TerrainData) {
  const group = new THREE.Group()
  group.name = 'terrain'
  const disposables: { dispose: () => void }[] = []
  const tr = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x)

  const tex = tr(new THREE.DataTexture(new Uint8Array(t.pixels.buffer.slice(0)), t.width, t.height, THREE.RGBAFormat))
  tex.flipY = false
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true

  const base = {
    uPresence: presence.terrain,
    uTime: shared.uTime,
    uFogColor: shared.uFogColor,
    uFogDensity: shared.uFogDensity,
    uFogHeightFalloff: shared.uFogHeightFalloff,
    uFogBase: shared.uFogBase,
  }

  const geo = tr(new THREE.PlaneGeometry(MAP_W * 1.6, MAP_D * 1.9, 640, 300))
  geo.rotateX(-Math.PI / 2)
  // Harita dışına taşan kısım düz deniz: uv'leri harita sınırına göre yeniden ölçekle
  const uvs = geo.attributes.uv as THREE.BufferAttribute
  const p = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < uvs.count; i++) {
    uvs.setXY(i, p.getX(i) / MAP_W + 0.5, 1 - (p.getZ(i) / MAP_D + 0.5))
  }
  const terrainMat = tr(
    new THREE.ShaderMaterial({
      vertexShader: terrainVertex,
      fragmentShader: terrainFragment,
      uniforms: { ...base, uMap: { value: tex }, uHeight: { value: MAP.heightScale }, uTexel: { value: new THREE.Vector2(1 / t.width, 1 / t.height) } },
    }),
  )
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  group.add(new THREE.Mesh(geo, terrainMat))

  // Eş-yükselti çizgileri
  const cpos: number[] = []
  const ccode: number[] = []
  for (const c of t.contours) {
    for (let j = 0; j < c.pts.length / 2 - 1; j++) {
      for (const k of [j, j + 1]) {
        const u = c.pts[k * 2]
        const v = c.pts[k * 2 + 1]
        const x = (u - 0.5) * MAP_W
        const z = (v - 0.5) * MAP_D
        const land = sample(t, u, v, 2)
        const y = land > 0.3 ? heightAt(t, u, v) + 0.035 : 0.02
        cpos.push(x, y, z)
        ccode.push(c.code)
      }
    }
  }
  const cgeo = tr(new THREE.BufferGeometry())
  cgeo.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3))
  cgeo.setAttribute('aCode', new THREE.Float32BufferAttribute(ccode, 1))
  const cmat = tr(
    new THREE.ShaderMaterial({
      vertexShader: contourVertex,
      fragmentShader: contourFragment,
      uniforms: { ...base, uColor: { value: new THREE.Color('#8fd6ff').multiplyScalar(1.7) } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  group.add(new THREE.LineSegments(cgeo, cmat))

  // Atlamalar: ışık sütunu + nabız halkası
  const pillarGeo = tr(new THREE.CylinderGeometry(0.05, 0.05, 7, 12, 1, true).translate(0, 3.5, 0))
  const pillUv = pillarGeo.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < pillUv.count; i++) pillUv.setY(i, 1 - pillUv.getY(i))
  const ringGeo = tr(new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2))
  const color = new THREE.Color('#9fdcff').multiplyScalar(1.6)
  // her atlama hangi işaretçiyi kullanıyor (aynı şehir tekrar edince aynı sütun)
  const markers: { pillar: THREE.ShaderMaterial; ring: THREE.ShaderMaterial }[] = []
  const hopMarker: number[] = []
  const byHost = new Map<string, number>()
  hops.forEach((h, i) => {
    if (h.remote) {
      hopMarker.push(-1)
      return
    }
    const existing = byHost.get(h.host)
    if (existing !== undefined) {
      hopMarker.push(existing)
      return
    }
    byHost.set(h.host, markers.length)
    hopMarker.push(markers.length)
    const pt = hopPoint(t, i)
    const pillar = tr(
      new THREE.ShaderMaterial({
        vertexShader: uvVertex,
        fragmentShader: pillarFragment,
        uniforms: { uPresence: presence.terrain, uOn: { value: 0 }, uColor: { value: color } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    const ring = tr(
      new THREE.ShaderMaterial({
        vertexShader: uvVertex,
        fragmentShader: ringFragment,
        uniforms: { uPresence: presence.terrain, uOn: { value: 0 }, uTime: shared.uTime, uColor: { value: color } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    const pm = new THREE.Mesh(pillarGeo, pillar)
    pm.position.copy(pt)
    const rm = new THREE.Mesh(ringGeo, ring)
    rm.position.copy(pt).add(new THREE.Vector3(0, 0.02, 0))
    group.add(pm, rm)
    markers.push({ pillar, ring })
  })

  // Rota yayları
  const arcs: THREE.ShaderMaterial[] = []
  for (let i = 0; i < hops.length - 1; i++) {
    const a = hopPoint(t, i)
    const b = hopPoint(t, i + 1)
    const dist = a.distanceTo(b)
    const remote = hops[i + 1].remote || hops[i].remote
    const mid = a.clone().add(b).multiplyScalar(0.5)
    mid.y += 1.6 + dist * (remote ? 0.32 : 0.22)
    if (hops[i].remote) {
      // dönüş yayı, gidişten biraz ayrık dursun
      mid.x += 2
      mid.z += 2
    }
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
    const tube = tr(new THREE.TubeGeometry(curve, Math.max(40, Math.round(dist * 2)), remote ? 0.06 : 0.075, 6, false))
    const mat = tr(
      new THREE.ShaderMaterial({
        vertexShader: uvVertex,
        fragmentShader: glowFragment,
        uniforms: {
          uPresence: presence.terrain,
          uTime: shared.uTime,
          uReveal: { value: 0 },
          uPacket: { value: remote ? 0.6 : 1 },
          uColor: { value: (remote ? new THREE.Color('#ffb07a') : new THREE.Color('#9fdcff')).multiplyScalar(remote ? 1.1 : 1.3) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    group.add(new THREE.Mesh(tube, mat))
    arcs.push(mat)
  }

  return {
    group,
    markers,
    hopMarker,
    arcs,
    dispose: () => disposables.forEach((d) => d.dispose()),
  }
}

export function Terrain() {
  const [data, setData] = useState<TerrainData | null>(null)
  useEffect(() => {
    let alive = true
    loadTerrain()
      .then((t) => alive && setData(t))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])
  const world = useMemo(() => (data ? build(data) : null), [data])
  useEffect(() => () => world?.dispose(), [world])

  useFrame(() => {
    if (!world) return
    const p = presence.terrain.value
    world.group.visible = p > 0.002
    if (!world.group.visible) return
    const F = useApp.getState().power === 'on' ? frame.film : 0
    const n = activeHop(F)
    const t = flightT(F) * (hops.length + 1)
    const target = new Array(world.markers.length).fill(0)
    world.hopMarker.forEach((mi, i) => {
      if (mi < 0) return
      const on = i === n - 1 ? 1 : i < n ? 0.35 : 0
      target[mi] = Math.max(target[mi], on)
    })
    world.markers.forEach((m, mi) => {
      const cur = m.pillar.uniforms.uOn.value as number
      const next = cur + (target[mi] - cur) * 0.08
      m.pillar.uniforms.uOn.value = next
      m.ring.uniforms.uOn.value = next
    })
    world.arcs.forEach((a, i) => {
      // i. yay, i+1. atlamadan i+2. atlamaya kadar çizilir
      a.uniforms.uReveal.value = Math.min(1, Math.max(0, t - (i + 1)))
    })
  })

  return world ? <primitive object={world.group} /> : null
}

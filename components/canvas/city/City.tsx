'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { fogGLSL, hashGLSL } from '../glsl'
import { sys } from '../system'
import { presence, shared } from '../uniforms'
import { DIE_SIZE, drawFloorplan, floorplan } from './floorplan'

/**
 * Silikon kalıp, gece şehri olarak: bloklar binalar, ara bağlantılar caddeler, sinyaller trafik.
 * Pencereler shader'da üretilir; çekirdekler (ilçeler) "modül yüklendikçe" ışıklanır.
 */

const buildingVertex = /* glsl */ `
attribute vec4 aInfo;
varying vec3 vWorld;
varying vec3 vN;
varying vec3 vLocal;
varying vec4 vInfo;
varying vec3 vScale;
void main() {
  vec3 scale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vN = normal;
  vLocal = position * scale;
  vScale = scale;
  vInfo = aInfo;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const buildingFragment = /* glsl */ `
uniform float uTime;
uniform float uPresence;
uniform float uDistrict[9];
uniform float uHighlight[9];
uniform float uOverclock;
varying vec3 vWorld;
varying vec3 vN;
varying vec3 vLocal;
varying vec4 vInfo;
varying vec3 vScale;
${hashGLSL}
${fogGLSL}
void main() {
  float seed = vInfo.x;
  float kind = vInfo.y;
  int di = int(vInfo.z + 0.5);
  float load = uDistrict[di];
  float hi = uHighlight[di];
  vec3 n = vN;
  vec3 col = vec3(0.022, 0.03, 0.045);
  vec3 emit = vec3(0.0);
  float shade = 0.55 + 0.45 * max(dot(n, normalize(vec3(-0.45, 0.75, 0.35))), 0.0);

  if (n.y < 0.5 && n.y > -0.5) {
    vec2 fp = abs(n.x) > 0.5 ? vec2(vLocal.z, vLocal.y) : vec2(vLocal.x, vLocal.y);
    vec2 cell = kind < 0.5 ? vec2(0.12, 0.1) : kind < 1.5 ? vec2(0.075, 0.085) : kind < 2.5 ? vec2(0.22, 0.14) : vec2(0.1, 0.12);
    float base = kind < 0.5 ? 0.24 : kind < 1.5 ? 0.42 : kind < 2.5 ? 0.16 : 0.4;
    float prob = base * mix(0.28, 1.0, load) + hi * 0.25 + uOverclock * 0.2;
    float wave = 0.5 + 0.5 * sin(vWorld.x * 0.16 - uTime * 1.1 + vWorld.z * 0.05 + seed);
    vec2 faceSeed = vec2(seed * 91.7, n.x * 13.0 + n.z * 7.0);

    // ince seviye: tek tek pencereler
    vec2 g = fp / cell;
    vec2 id = floor(g);
    vec2 f = fract(g);
    // yakından bakınca pencereler kat boyunca uzanan şeritlere dönüşür (delik delik görünmesin)
    float fwg = max(fwidth(g.x), fwidth(g.y));
    float close = 1.0 - smoothstep(0.035, 0.11, fwg);
    float wx = mix(0.26, 0.1, close);
    float wy = mix(0.32, 0.4, close);
    float win = step(wx, f.x) * step(f.x, 1.0 - wx) * step(wy, f.y) * step(f.y, 0.72);
    float r = hash21(id + faceSeed);
    float flick = step(0.997, hash21(id + floor(uTime * 0.7 + seed * 13.0)));
    float lit = abs(step(1.0 - prob, r) - flick);
    float h2 = hash21(id * 1.31 + seed);

    // kaba seviye: uzaktan seyrek, parlak noktalar (gri bir sise dönüşmesin)
    vec2 g1 = fp / (cell * 3.0);
    vec2 id1 = floor(g1);
    vec2 f1 = fract(g1);
    float win1 = step(0.36, f1.x) * step(f1.x, 0.64) * step(0.38, f1.y) * step(f1.y, 0.62);
    float r1 = hash21(id1 + faceSeed + 17.0);
    float lit1 = step(1.0 - prob * 0.8, r1);
    float h3 = hash21(id1 * 1.7 + seed);

    float fw = max(fwidth(g.x), fwidth(g.y));
    float d0 = 1.0 - smoothstep(0.3, 0.8, fw);
    float d1 = 1.0 - smoothstep(0.3, 0.8, fw / 3.0);
    float avg = 0.08 * prob;
    float k0 = mix(0.45, 1.35, r * r) * mix(1.0, 0.7, close);
    float k1 = mix(0.8, 2.2, r1 * r1);
    float coarse = mix(avg, win1 * lit1 * k1, d1);
    float w = mix(coarse, win * lit * k0, d0);
    float hsel = d0 > 0.5 ? h2 : h3;
    vec3 cold = vec3(0.5, 0.78, 1.0);
    vec3 white = vec3(0.86, 0.93, 1.0);
    vec3 warm = vec3(1.0, 0.62, 0.34);
    vec3 wc = hsel > 0.965 ? warm : hsel > 0.55 ? white : cold;
    emit = wc * w * (0.8 + 0.4 * wave) * (1.0 + hi * 1.3) * (0.55 + 0.45 * load) * 1.15;
    // caddelerden yansıyan alt ışık
    col += vec3(0.05, 0.11, 0.2) * exp(-vLocal.y * 1.7) * 0.8;
    // köşe çizgisi: silüetleri belirginleştirir
    float halfW = (abs(n.x) > 0.5 ? vScale.z : vScale.x) * 0.5;
    float edge = smoothstep(0.04, 0.0, halfW - abs(fp.x)) + smoothstep(0.03, 0.0, vScale.y - vLocal.y);
    col += vec3(0.035, 0.06, 0.09) * edge;
  } else if (n.y >= 0.5) {
    col = vec3(0.018, 0.024, 0.034) + vec3(0.02, 0.03, 0.045) * hash21(vec2(seed, 3.0));
    if (kind > 2.5 && kind < 3.5) {
      float blink = step(0.55, fract(uTime * 0.45 + seed * 3.0));
      emit += vec3(1.0, 0.42, 0.32) * blink * 3.0;
    }
    if (kind > 3.5) emit += vec3(0.62, 0.72, 0.85) * 0.9;
  }
  vec3 color = col * shade + emit;
  float fogF = fogFactor(vWorld, cameraPosition);
  color = mix(color, uFogColor, fogF);
  color = mix(uFogColor, color, uPresence);
  gl_FragColor = vec4(color, 1.0);
}
`

const groundFragment = /* glsl */ `
uniform sampler2D uGlow;
uniform float uTime;
uniform float uPresence;
uniform float uLoad;
varying vec3 vWorld;
${fogGLSL}
float grid(vec2 p, float s, float w) {
  vec2 g = abs(fract(p / s - 0.5) - 0.5) * s;
  float d = min(g.x, g.y);
  float fw = fwidth(d);
  return 1.0 - smoothstep(w, w + fw * 1.5, d);
}
void main() {
  vec2 uv = vec2((vWorld.x + ${(DIE_SIZE.w / 2).toFixed(1)}) / ${DIE_SIZE.w.toFixed(1)}, 1.0 - (vWorld.z + ${(DIE_SIZE.d / 2).toFixed(1)}) / ${DIE_SIZE.d.toFixed(1)});
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  vec3 col = mix(vec3(0.012, 0.016, 0.024), vec3(0.018, 0.024, 0.036), inside);
  col += vec3(0.03, 0.05, 0.08) * grid(vWorld.xz, 4.0, 0.02) * inside;
  col += vec3(0.02, 0.035, 0.055) * grid(vWorld.xz, 0.5, 0.01) * inside;
  vec3 glow = texture2D(uGlow, uv).rgb * inside;
  float pulse = 0.85 + 0.15 * sin(uTime * 0.8 + vWorld.x * 0.05);
  col += glow * 0.62 * pulse * uLoad;
  // paket kenarı
  vec2 e = abs(vWorld.xz) - vec2(${(DIE_SIZE.w / 2 + 1.2).toFixed(1)}, ${(DIE_SIZE.d / 2 + 1.2).toFixed(1)});
  col += vec3(0.04, 0.07, 0.1) * (1.0 - smoothstep(0.0, 0.35, abs(max(e.x, e.y))));
  float fogF = fogFactor(vWorld, cameraPosition);
  col = mix(col, uFogColor, fogF);
  col = mix(uFogColor, col, uPresence);
  gl_FragColor = vec4(col, 1.0);
}
`

const beamVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormalW;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const beamFragment = /* glsl */ `
uniform float uTime;
uniform float uPresence;
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormalW;
${hashGLSL}
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float rim = pow(1.0 - abs(dot(v, vNormalW)), 1.6);
  float along = pow(1.0 - vUv.y, 1.7) * smoothstep(0.0, 0.04, vUv.y);
  float dust = 0.75 + 0.25 * sin(vUv.y * 40.0 - uTime * 2.0 + vUv.x * 30.0);
  float a = (1.0 - rim) * along * dust;
  gl_FragColor = vec4(uColor * a * uPresence, 1.0);
}
`

function glowTexture(density: number) {
  const W = 2048
  const H = 1536
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  drawFloorplan(ctx, floorplan(density), W, H, { roofs: false, glow: 1.6, base: '#000000', streetColor: '#2f86d6', padColor: '#000' })
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export function City({ density }: { density: number }) {
  const scene = useMemo(() => {
    const fp = floorplan(density)
    const group = new THREE.Group()
    group.name = 'city'

    // Binalar
    const geo = new THREE.BoxGeometry(1, 1, 1)
    geo.translate(0, 0.5, 0)
    const n = fp.buildings.length
    const info = new Float32Array(n * 4)
    const mat = new THREE.ShaderMaterial({
      vertexShader: buildingVertex,
      fragmentShader: buildingFragment,
      uniforms: {
        uTime: shared.uTime,
        uPresence: presence.city,
        uDistrict: { value: sys.districts },
        uHighlight: { value: sys.highlight },
        uOverclock: { value: 0 },
        uFogColor: shared.uFogColor,
        uFogDensity: shared.uFogDensity,
        uFogHeightFalloff: shared.uFogHeightFalloff,
        uFogBase: shared.uFogBase,
      },
    })
    const mesh = new THREE.InstancedMesh(geo, mat, n)
    const m = new THREE.Matrix4()
    fp.buildings.forEach((b, i) => {
      m.makeScale(b.w, b.h, b.d)
      m.setPosition(b.x, 0, b.z)
      mesh.setMatrixAt(i, m)
      info.set([b.seed, b.kind, b.district, b.h], i * 4)
    })
    geo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 4))
    mesh.instanceMatrix.needsUpdate = true
    mesh.frustumCulled = false
    group.add(mesh)

    // Zemin: kalıp yüzeyi + yol ışıması
    const glow = glowTexture(density)
    const groundMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: groundFragment,
      uniforms: {
        uGlow: { value: glow },
        uTime: shared.uTime,
        uPresence: presence.city,
        uLoad: { value: 1 },
        uFogColor: shared.uFogColor,
        uFogDensity: shared.uFogDensity,
        uFogHeightFalloff: shared.uFogHeightFalloff,
        uFogBase: shared.uFogBase,
      },
    })
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 220).rotateX(-Math.PI / 2), groundMat)
    group.add(ground)

    // Arama ışıkları: kulelerden göğe
    const beamMat = new THREE.ShaderMaterial({
      vertexShader: beamVertex,
      fragmentShader: beamFragment,
      uniforms: { uTime: shared.uTime, uPresence: presence.city, uColor: { value: new THREE.Color('#9fd8ff').multiplyScalar(0.05) } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const beamGeo = new THREE.CylinderGeometry(2.6, 0.25, 70, 32, 1, true)
    beamGeo.translate(0, 35, 0)
    // uv.y 0 = taban olacak şekilde
    const uvs = beamGeo.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uvs.count; i++) uvs.setY(i, 1 - uvs.getY(i))
    const beams: THREE.Mesh[] = []
    fp.districts
      .filter((d) => d.id < 6 && d.id % 2 === 0)
      .forEach((d, i) => {
        const b = new THREE.Mesh(beamGeo, beamMat)
        b.position.set(d.tower[0], d.tower[1], d.tower[2])
        b.userData.phase = i * 2.1
        beams.push(b)
        group.add(b)
      })

    return { group, mat, beams, glow, dispose: () => {
      geo.dispose(); mat.dispose(); groundMat.dispose(); glow.dispose(); beamGeo.dispose(); beamMat.dispose(); ground.geometry.dispose()
    } }
  }, [density])

  useEffect(() => () => scene.dispose(), [scene])

  useFrame((state) => {
    const p = presence.city.value
    scene.group.visible = p > 0.002
    if (!scene.group.visible) return
    const t = state.clock.elapsedTime
    scene.mat.uniforms.uOverclock.value = sys.overclock
    scene.beams.forEach((b) => {
      const ph = b.userData.phase as number
      b.rotation.z = Math.sin(t * 0.13 + ph) * 0.38
      b.rotation.x = Math.cos(t * 0.11 + ph * 1.3) * 0.3
    })
  })

  return <primitive object={scene.group} />
}

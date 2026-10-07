'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { DIE, boardLayout } from '../board/layout'
import { channels, timeline } from '@/lib/content'
import { boardFlow, cityFlow, initPositions, logoForm, seedTexture, terrainForm } from './formations'
import { FORM, pointsFragment, pointsVertex, simFragment, simVertex, type FormId } from './shaders'
import { loadTerrain } from '../terrain/data'
import { analyzerX, CHANNEL_Z } from '../analyzer/geometry'

/** Yönetmenin (Director) her karede yazdığı parçacık parametreleri. */
export const particleState = {
  formA: FORM.DORMANT as FormId,
  formB: FORM.DORMANT as FormId,
  mix: 0,
  stagger: 0.4,
  stiff: 40,
  damp: 12,
  turb: 0,
  curl: 0,
  curlScale: 0.25,
  teleport: 1e9,
  flowSpeed: 1,
  laneSpeed: 0.035,
  laneHi: -1,
  laneHiAmt: 0,
  waveSpeed: 0.012,
  cursorX: 0,
  clockSquare: 0,
  dustR: 8,
  sizeMul: 1,
  bright: 1,
  fogDensity: 0,
  mouse: 0,
  mouseR: 1,
  camPos: new THREE.Vector3(),
  rayO: new THREE.Vector3(0, -1e4, 0),
  rayD: new THREE.Vector3(0, 1, 0),
  cut: new THREE.Matrix4(),
  cutPending: false,
}

function dataTex(data: Float32Array | null, N: number) {
  const t = new THREE.DataTexture(data ?? new Float32Array(4), data ? N : 1, data ? N : 1, THREE.RGBAFormat, THREE.FloatType)
  t.minFilter = THREE.NearestFilter
  t.magFilter = THREE.NearestFilter
  t.generateMipmaps = false
  t.needsUpdate = true
  return t
}

class ParticleSim {
  readonly N: number
  /** parçacık sayısı arttıkça tek tek sönükleşir: toplam ışık kademeye göre değişmesin */
  readonly density: number
  private renderer: THREE.WebGLRenderer
  private targets: THREE.WebGLRenderTarget[]
  private read = 0
  private simMat: THREE.RawShaderMaterial
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private inited = false
  readonly points: THREE.Points
  readonly material: THREE.ShaderMaterial
  private textures: Record<string, THREE.DataTexture> = {}

  constructor(renderer: THREE.WebGLRenderer, N: number) {
    this.N = N
    this.density = Math.min(2, Math.max(0.22, Math.pow((256 * 256) / (N * N), 0.75)))
    this.renderer = renderer
    const full = renderer.extensions.has('EXT_color_buffer_float')
    const type = full ? THREE.FloatType : THREE.HalfFloatType
    const mk = () =>
      new THREE.WebGLRenderTarget(N, N, {
        count: 2,
        type,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
        generateMipmaps: false,
      })
    this.targets = [mk(), mk()]

    const seed = dataTex(seedTexture(N), N)
    const init = dataTex(initPositions(N, boardLayout().anchors.led), N)
    const empty = () => dataTex(null, N)
    this.textures = { seed, init, boardA: empty(), boardB: empty(), cityA: empty(), cityB: empty(), logo: empty(), terrain: empty() }

    const chan = Array.from({ length: 8 }, () => new THREE.Vector2(-999, -999))
    const chanZ = new Array(8).fill(0)
    chanZ[0] = CHANNEL_Z[0]
    channels.forEach((c, i) => {
      chan[i + 1].set(analyzerX(c.from), analyzerX(c.to ?? timeline.end + 0.4))
      chanZ[i + 1] = CHANNEL_Z[i + 1]
    })

    this.simMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: simVertex,
      fragmentShader: simFragment,
      uniforms: {
        uPos: { value: null },
        uVel: { value: null },
        uSeed: { value: seed },
        uInitTex: { value: init },
        uBoardA: { value: this.textures.boardA },
        uBoardB: { value: this.textures.boardB },
        uCityA: { value: this.textures.cityA },
        uCityB: { value: this.textures.cityB },
        uLogo: { value: this.textures.logo },
        uTerrain: { value: this.textures.terrain },
        uInit: { value: 1 },
        uTime: { value: 0 },
        uDt: { value: 0.016 },
        uFormA: { value: 0 },
        uFormB: { value: 0 },
        uMix: { value: 0 },
        uStagger: { value: 0.4 },
        uStiff: { value: 40 },
        uDamp: { value: 12 },
        uTurb: { value: 0 },
        uCurl: { value: 0 },
        uCurlScale: { value: 0.25 },
        uTeleport: { value: 1e9 },
        uCut: { value: new THREE.Matrix4() },
        uAnchor: { value: new THREE.Vector3(...boardLayout().anchors.led) },
        uDie: { value: new THREE.Vector3(DIE.x, DIE.y, DIE.z) },
        uDieSize: { value: new THREE.Vector2(DIE.w, DIE.d) },
        uXtal: { value: new THREE.Vector3(...boardLayout().anchors.xtal) },
        uClockSquare: { value: 0 },
        uCamPos: { value: new THREE.Vector3() },
        uDustR: { value: 8 },
        uFlowSpeed: { value: 1 },
        uLaneSpeed: { value: 0.035 },
        uLaneHi: { value: -1 },
        uLaneHiAmt: { value: 0 },
        uChan: { value: chan },
        uChanZ: { value: chanZ },
        uWaveSpeed: { value: 0.012 },
        uCursorX: { value: 0 },
        uRayO: { value: new THREE.Vector3() },
        uRayD: { value: new THREE.Vector3(0, 1, 0) },
        uMouse: { value: 0 },
        uMouseR: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    })
    const tri = new THREE.BufferGeometry()
    tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
    const quad = new THREE.Mesh(tri, this.simMat)
    quad.frustumCulled = false
    this.scene.add(quad)

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * N), 1))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5)
    this.material = new THREE.ShaderMaterial({
      vertexShader: pointsVertex,
      fragmentShader: pointsFragment,
      uniforms: {
        uPos: { value: null },
        uVel: { value: null },
        uSeed: { value: seed },
        uN: { value: N },
        uScale: { value: 800 },
        uSizeMul: { value: 1 },
        uFogDensity: { value: 0 },
        uBright: { value: 1 },
        uCold: { value: new THREE.Color('#8fdcff').multiplyScalar(1.7) },
        uWarm: { value: new THREE.Color('#ffae73').multiplyScalar(1.6) },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    })
    this.points = new THREE.Points(geo, this.material)
    this.points.frustumCulled = false
    this.points.renderOrder = 20
  }

  setFormation(name: 'boardA' | 'boardB' | 'cityA' | 'cityB' | 'logo' | 'terrain', data: Float32Array) {
    const old = this.textures[name]
    const t = dataTex(data, this.N)
    this.textures[name] = t
    const key = { boardA: 'uBoardA', boardB: 'uBoardB', cityA: 'uCityA', cityB: 'uCityB', logo: 'uLogo', terrain: 'uTerrain' }[name]
    this.simMat.uniforms[key].value = t
    old.dispose()
  }

  step(dt: number, time: number) {
    const s = particleState
    const u = this.simMat.uniforms
    u.uTime.value = time
    u.uFormA.value = s.formA
    u.uFormB.value = s.formB
    u.uMix.value = s.mix
    u.uStagger.value = s.stagger
    u.uStiff.value = s.stiff
    u.uDamp.value = s.damp
    u.uTurb.value = s.turb
    u.uCurl.value = s.curl
    u.uCurlScale.value = s.curlScale
    u.uTeleport.value = s.teleport
    u.uFlowSpeed.value = s.flowSpeed
    u.uLaneSpeed.value = s.laneSpeed
    u.uLaneHi.value = s.laneHi
    u.uLaneHiAmt.value = s.laneHiAmt
    u.uWaveSpeed.value = s.waveSpeed
    u.uCursorX.value = s.cursorX
    u.uClockSquare.value = s.clockSquare
    u.uDustR.value = s.dustR
    u.uMouse.value = s.mouse
    u.uMouseR.value = s.mouseR
    ;(u.uCamPos.value as THREE.Vector3).copy(s.camPos)
    ;(u.uRayO.value as THREE.Vector3).copy(s.rayO)
    ;(u.uRayD.value as THREE.Vector3).copy(s.rayD)

    const steps = dt > 1 / 40 ? 2 : 1
    const h = Math.min(dt, 1 / 20) / steps
    u.uDt.value = h
    const prev = this.renderer.getRenderTarget()
    for (let i = 0; i < steps; i++) {
      const src = this.targets[this.read]
      const dst = this.targets[1 - this.read]
      u.uPos.value = src.textures[0]
      u.uVel.value = src.textures[1]
      u.uInit.value = this.inited ? 0 : 1
      ;(u.uCut.value as THREE.Matrix4).copy(s.cutPending && i === 0 ? s.cut : IDENTITY)
      this.renderer.setRenderTarget(dst)
      this.renderer.render(this.scene, this.camera)
      this.read = 1 - this.read
      this.inited = true
    }
    s.cutPending = false
    this.renderer.setRenderTarget(prev)

    const m = this.material.uniforms
    const cur = this.targets[this.read]
    m.uPos.value = cur.textures[0]
    m.uVel.value = cur.textures[1]
    m.uSizeMul.value = s.sizeMul
    m.uBright.value = s.bright * this.density
    m.uFogDensity.value = s.fogDensity
  }

  dispose() {
    this.targets.forEach((t) => t.dispose())
    Object.values(this.textures).forEach((t) => t.dispose())
    this.simMat.dispose()
    this.material.dispose()
    this.points.geometry.dispose()
  }
}

const IDENTITY = new THREE.Matrix4()

export function Particles({ N, cityDensity }: { N: number; cityDensity: number }) {
  const gl = useThree((s) => s.gl)
  const sim = useMemo(() => new ParticleSim(gl, N), [gl, N])

  useEffect(() => {
    let cancelled = false
    // Formasyonları sırayla, ana iş parçacığını uzun süre kilitlemeden üret.
    const jobs: (() => void | Promise<void>)[] = [
      () => {
        const f = boardFlow(N)
        sim.setFormation('boardA', f.a)
        sim.setFormation('boardB', f.b)
      },
      async () => {
        await document.fonts?.ready
        sim.setFormation('logo', logoForm(N))
      },
      () => {
        const f = cityFlow(N, cityDensity)
        sim.setFormation('cityA', f.a)
        sim.setFormation('cityB', f.b)
      },
      async () => {
        const t = await loadTerrain()
        if (!cancelled) sim.setFormation('terrain', terrainForm(N, t))
      },
    ]
    ;(async () => {
      for (const job of jobs) {
        if (cancelled) return
        await job()
        await new Promise((r) => setTimeout(r, 30))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sim, N, cityDensity])

  useEffect(() => () => sim.dispose(), [sim])

  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera
    sim.material.uniforms.uScale.value = state.size.height * state.viewport.dpr * 0.5 / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
    sim.step(dt, state.clock.elapsedTime)
  }, -5)

  return <primitive object={sim.points} />
}

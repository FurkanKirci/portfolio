'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { hops, offMap } from '@/lib/content'
import { cursorYear, flightT } from '@/lib/film'
import { laneClassOf } from '@/lib/procs'
import { clamp, damp, invLerp, lerp, smootherstep, smoothstep } from '@/lib/math'
import { frame, useApp } from '@/lib/store'
import { analyzerX } from './analyzer/geometry'
import { labels } from './labels'
import { motesState } from './Motes'
import { particleState } from './particles/Particles'
import { FORM, type FormId } from './particles/shaders'
import { BOARD_SHOTS, CITY_ENTRY_HEIGHT, debugShot, type Pose } from './shots'
import { BOOT, sys, updateSystem } from './system'
import { lonLatToXZ } from './terrain/data'
import { presence, shared, type WorldId } from './uniforms'

// Her karede yeniden ayrılmasın diye paylaşılan geçici vektörler
const AXIS_Y = new THREE.Vector3(0, 1, 0)
const AXIS_NEG_Z = new THREE.Vector3(0, 0, -1)
const tmpOffset = new THREE.Vector3()
const tmpRight = new THREE.Vector3()

/** Alan derinliği için Effects'in okuduğu durum. */
export const dofState = { focus: 10, range: 6, bokeh: 3 }
/** Ekran parlaması (çipe dalarken) */
export const flash = { value: 0 }

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const P = (pos: THREE.Vector3, target: THREE.Vector3, fov = 34, range = 0): Pose => ({ pos, target, fov, range })

/** İki poz arasında yumuşak geçiş */
function mixPose(a: Pose, b: Pose, t: number, out: Pose) {
  out.pos.lerpVectors(a.pos, b.pos, t)
  out.target.lerpVectors(a.target, b.target, t)
  out.fov = lerp(a.fov, b.fov, t)
  out.range = lerp(a.range ?? 0, b.range ?? 0, t)
  return out
}

function curvePose(pos: THREE.CatmullRomCurve3, tgt: THREE.CatmullRomCurve3, t: number, fov: number, range: number, out: Pose) {
  pos.getPoint(clamp(t), out.pos)
  tgt.getPoint(clamp(t), out.target)
  out.fov = fov
  out.range = range
  return out
}

/* ------------------------------------------------------------- dünya sahneleri */

const CITY = {
  entry: P(V(0.001, CITY_ENTRY_HEIGHT, 0.02), V(0, 0, 0), 33, 40),
  low: P(V(-52, 22, 50), V(-22, 0, 10), 34, 30),
  fly: {
    pos: new THREE.CatmullRomCurve3([V(-52, 24, 50), V(-36, 17, 33), V(-18, 15, 23), V(0, 14.5, 16), V(15, 16, 12)]),
    tgt: new THREE.CatmullRomCurve3([V(-22, 0, 10), V(-8, 0, -2), V(8, 0, -10), V(22, 0, -16), V(30, 0, -20)]),
  },
  overview: P(V(-34, 68, 66), V(-15, 0, 2), 34, 60),
  street: P(V(-52, 2.4, -5.85), V(30, 0.8, -5.85), 36, 18),
}

const SCHED = {
  entry: P(V(7, 12, 36), V(-8, 0, -30), 36, 30),
  a: P(V(3, 6, 22), V(-10, 0.5, -36), 36, 26),
  b: P(V(1.2, 4.4, 13), V(-12, 0.3, -44), 36, 24),
  exit: P(V(-1, 24, 6), V(-6, 0, -30), 36, 30),
}

function terrainHop(i: number) {
  const h = hops[i]
  const [x, z] = lonLatToXZ(h.lon, h.lat)
  return V(x, 1.4, z)
}

/* --------------------------------------------------------- parçacık zamanlaması */

type Win = [number, number, FormId, FormId]
const FILM_WINDOWS: Win[] = [
  [0.72, 1.0, FORM.LOGO, FORM.DIVE],
  [1.2, 1.32, FORM.FREE, FORM.CITY],
  [2.94, 3.05, FORM.CITY, FORM.DUST],
  [3.05, 3.15, FORM.FREE, FORM.LANES],
  [3.93, 4.04, FORM.LANES, FORM.DUST],
  [4.04, 4.13, FORM.FREE, FORM.WAVES],
  [4.93, 5.04, FORM.WAVES, FORM.DUST],
  [5.04, 5.14, FORM.FREE, FORM.TERRAIN],
  [5.93, 6.04, FORM.TERRAIN, FORM.DUST],
  [6.04, 6.14, FORM.FREE, FORM.BOARD],
  [6.6, 6.82, FORM.BOARD, FORM.COLLAPSE],
]
const BOOT_WINDOWS: Win[] = [
  [0.3, 1.5, FORM.DORMANT, FORM.BOARD],
  [1.5, 1.95, FORM.BOARD, FORM.CLOCK],
  [2.8, 3.3, FORM.CLOCK, FORM.BOARD],
  [4.65, 5.7, FORM.BOARD, FORM.LOGO],
]

function formationAt(x: number, wins: Win[], initial: FormId) {
  let hold = initial
  for (const [a, b, from, to] of wins) {
    if (x >= a && x < b) return { a: from, b: to, mix: (x - a) / (b - a), morph: true }
    if (x >= b) hold = to
  }
  return { a: hold, b: hold, mix: 1, morph: false }
}

const CUTS: [number, WorldId, WorldId][] = [
  [1.2, 'board', 'city'],
  [3.05, 'city', 'sched'],
  [4.04, 'sched', 'analyzer'],
  [5.04, 'analyzer', 'terrain'],
  [6.04, 'terrain', 'board'],
]

/** Film zamanına göre hangi dünyada olduğumuz ve ne kadar göründüğü */
function worldAt(F: number): { world: WorldId; presence: number } {
  let world: WorldId = 'board'
  for (const [c, , to] of CUTS) if (F >= c) world = to
  let pres = 1
  for (const [c] of CUTS) {
    if (c === 1.2) continue
    if (F >= c - 0.045 && F < c) pres = Math.min(pres, invLerp(c, c - 0.045, F))
    if (F >= c && F < c + 0.055) pres = Math.min(pres, invLerp(c, c + 0.055, F))
  }
  return { world, presence: smoothstep(0, 1, pres) }
}

/* ------------------------------------------------------------------ yönetmen */

export function Director() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const scene = useThree((s) => s.scene)
  const shot = useMemo<Pose>(() => P(V(0, 0, 0), V(0, 0, 0)), [])
  const tmp = useMemo<Pose>(() => P(V(0, 0, 0), V(0, 0, 0)), [])
  const smooth = useRef({ pos: V(12, 2, 11), target: V(10, 0, 8), fov: 30, init: false })
  const lastWorld = useRef<WorldId>('board')
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const prevMatrix = useMemo(() => new THREE.Matrix4(), [])
  const lookTarget = useMemo(() => V(0, 0, 0), [])

  const terrainPath = useMemo(() => {
    const pts = hops.map((_, i) => terrainHop(i))
    const camOff = V(-9, 27, 31)
    const positions: THREE.Vector3[] = [V(4, 56, 52)]
    const targets: THREE.Vector3[] = [V(2, 0, 2)]
    pts.forEach((p, i) => {
      if (offMap(hops[i])) {
        // Harita dışındaki durak: bir önceki duraktan, paketin gittiği yöne doğru bak (yay ufka uzanır)
        let k = i - 1
        while (k > 0 && offMap(hops[k])) k--
        const from = pts[Math.max(0, k)]
        const dir = V(p.x - from.x, 0, p.z - from.z).normalize()
        positions.push(from.clone().add(camOff).addScaledVector(dir, -4).add(V(0, 2, 0)))
        targets.push(from.clone().addScaledVector(dir, 30).setY(0))
      } else {
        positions.push(p.clone().add(camOff))
        targets.push(p.clone())
      }
    })
    positions.push(V(3, 62, 46))
    targets.push(V(0, 0, 1))
    return {
      pos: new THREE.CatmullRomCurve3(positions, false, 'centripetal'),
      tgt: new THREE.CatmullRomCurve3(targets, false, 'centripetal'),
    }
  }, [])

  useFrame((state, dt) => {
    updateSystem(dt)
    shared.uTime.value = state.clock.elapsedTime
    shared.uPixelRatio.value = state.viewport.dpr

    const app = useApp.getState()
    const power = app.power
    const F = power === 'on' ? frame.film : 0
    const bt = frame.bootT
    const motion = app.settings.motion === 'full' ? 1 : 0.25

    /* ---- kamera hedefi ---- */
    let world: WorldId = 'board'
    let pres = 1
    if (power === 'off') {
      Object.assign(shot, { fov: BOARD_SHOTS.standby.fov, range: BOARD_SHOTS.standby.range })
      shot.pos.copy(BOARD_SHOTS.standby.pos)
      shot.target.copy(BOARD_SHOTS.standby.target)
      // basılı tutarken hafifçe yaklaş
      shot.pos.lerp(shot.target, sys.hold * 0.12)
    } else if (power === 'booting') {
      const s = BOARD_SHOTS
      if (bt < 1.45) mixPose(s.standby, s.reveal, smootherstep(0.05, 1.45, bt), shot)
      else if (bt < 2.85) mixPose(s.reveal, s.clock, smootherstep(1.45, 2.4, bt), shot)
      else if (bt < 4.6) mixPose(s.clock, s.crane, smootherstep(2.85, 4.6, bt), shot)
      else mixPose(s.crane, s.hero, smootherstep(4.6, BOOT.end, bt), shot)
    } else {
      const w = worldAt(F)
      world = w.world
      pres = w.presence
      computeFilmShot(F, shot, tmp, terrainPath)
    }
    if (debugShot.pose) mixPose(debugShot.pose, debugShot.pose, 0, shot)
    debugShot.camera = camera
    debugShot.gl = state.gl

    /* ---- dünyalar arası kesme: parçacıklar ekranda yerinde kalsın ---- */
    const cut = world !== lastWorld.current
    if (cut) {
      camera.updateMatrixWorld()
      prevMatrix.copy(camera.matrixWorld)
    }

    /* ---- yumuşatma + el kamerası + fare paralaksı + sürükleyerek bakış ---- */
    const sm = smooth.current
    const snap = !sm.init || cut || frame.snap > 0
    const lam = power === 'booting' ? 10 : 7
    if (snap) {
      sm.pos.copy(shot.pos)
      sm.target.copy(shot.target)
      sm.fov = shot.fov
      sm.init = true
    } else {
      sm.pos.x = damp(sm.pos.x, shot.pos.x, lam, dt)
      sm.pos.y = damp(sm.pos.y, shot.pos.y, lam, dt)
      sm.pos.z = damp(sm.pos.z, shot.pos.z, lam, dt)
      sm.target.x = damp(sm.target.x, shot.target.x, lam, dt)
      sm.target.y = damp(sm.target.y, shot.target.y, lam, dt)
      sm.target.z = damp(sm.target.z, shot.target.z, lam, dt)
      sm.fov = damp(sm.fov, shot.fov, lam, dt)
    }

    const dist = sm.pos.distanceTo(sm.target)
    const t = state.clock.elapsedTime
    const hand = 0.0022 * motion
    const px = (frame.pointer.inside ? frame.pointer.nx : 0) * motion
    const py = (frame.pointer.inside ? frame.pointer.ny : 0) * motion
    camera.position.copy(sm.pos)
    // fare paralaksı: hedef etrafında küçük bir yörünge
    const yaw = px * 0.045 + frame.look.yaw + Math.sin(t * 0.37) * hand * 3
    const pitch = py * 0.03 + frame.look.pitch + Math.sin(t * 0.29 + 1.3) * hand * 2
    const offset = tmpOffset.copy(camera.position).sub(sm.target)
    offset.applyAxisAngle(AXIS_Y, -yaw)
    const right = tmpRight.crossVectors(offset, AXIS_Y).normalize()
    if (right.lengthSq() > 0.5) offset.applyAxisAngle(right, pitch)
    camera.position.copy(sm.target).add(offset)
    lookTarget.copy(sm.target)
    lookTarget.x += Math.sin(t * 0.53) * hand * dist
    lookTarget.y += Math.sin(t * 0.41 + 2.1) * hand * dist
    // tam tepeden bakarken lookAt'in bozulmaması için yukarı vektörü kuzeye çevir
    const vertical = Math.abs(offset.y / Math.max(1e-6, offset.length()))
    camera.up.set(0, 1, 0).lerp(AXIS_NEG_Z, smoothstep(0.96, 0.9995, vertical)).normalize()
    camera.lookAt(lookTarget)
    // Dikey ekranlarda görüş alanını biraz aç: yatay için kurulan kadrajlar dar ekranda kesilmesin
    const aspect = state.size.width / Math.max(1, state.size.height)
    const widen = aspect < 1.2 ? Math.pow(1.2 / aspect, 0.6) : 1
    const fov = widen > 1 ? (2 * Math.atan(Math.tan((sm.fov * Math.PI) / 360) * widen) * 180) / Math.PI : sm.fov
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    camera.updateMatrixWorld()

    if (cut) {
      // M_yeni * M_eski^-1: kesmeden önceki görünüm, kesmeden sonra aynı kalır
      particleState.cut.copy(camera.matrixWorld).multiply(prevMatrix.clone().invert())
      particleState.cutPending = true
      lastWorld.current = world
    }

    /* ---- dünyaların görünürlüğü ve sis ---- */
    for (const k of Object.keys(presence) as WorldId[]) presence[k].value = k === world ? pres : 0
    applyAtmosphere(world, pres, scene)
    flash.value = power === 'on' ? Math.max(0, 1 - Math.abs(F - 1.2) / 0.025) * 0.85 : 0

    /* ---- alan derinliği ---- */
    dofState.focus = dist
    dofState.range = shot.range && shot.range > 0 ? shot.range : dist * 0.5
    dofState.bokeh = world === 'board' ? (power === 'off' ? 5 : 3.2) : world === 'city' ? 1.7 : world === 'terrain' ? 1.2 : world === 'sched' ? 0.9 : 1.4

    /* ---- parçacıklar ---- */
    const ps = particleState
    let f: { a: FormId; b: FormId; mix: number; morph: boolean }
    if (power === 'off') f = { a: FORM.DORMANT, b: FORM.DORMANT, mix: 1, morph: false }
    else if (power === 'booting') f = formationAt(bt, BOOT_WINDOWS, FORM.DORMANT)
    else f = F < 0.01 && frame.bootT >= 0 ? { a: FORM.LOGO, b: FORM.LOGO, mix: 1, morph: false } : formationAt(F, FILM_WINDOWS, FORM.LOGO)
    ps.formA = f.a
    ps.formB = f.b
    ps.mix = f.mix
    ps.stagger = 0.42
    const flowHold = !f.morph && (f.b === FORM.BOARD || f.b === FORM.CITY || f.b === FORM.LANES || f.b === FORM.WAVES)
    const stiff = f.morph ? 8 : flowHold ? 80 : 14
    ps.stiff = stiff
    ps.damp = 2 * Math.sqrt(stiff) * (f.morph ? 0.9 : 1)
    ps.teleport = flowHold ? (world === 'board' ? 0.6 : world === 'city' ? 3.5 : 25) : 1e9
    ps.turb = world === 'board' ? 0.02 : world === 'terrain' ? 0.05 : 0.25
    ps.curl = f.morph ? (world === 'board' ? 0.4 : 3.0) : 0
    ps.curlScale = world === 'board' ? 1.2 : 0.12
    ps.clockSquare = smoothstep(1.95, 2.55, bt)
    ps.camPos.copy(camera.position)
    ps.dustR = world === 'board' ? 4 : world === 'city' ? 26 : 18
    ps.fogDensity = world === 'board' ? 0.012 : world === 'terrain' ? 0.006 : 0.008
    ps.bright = power === 'off' ? 0 : world === 'board' && F > 6.14 ? 1 - smoothstep(6.2, 6.6, F) * 0.6 : 1
    if (F >= 6.82) ps.bright = Math.max(0, 1 - (F - 6.82) / 0.1)
    if (f.morph) ps.bright *= 0.6
    ps.laneHi = app.hoverProc !== null || app.proc !== null ? laneClassOf(app.proc ?? app.hoverProc ?? 0) : -1
    ps.laneHiAmt = damp(ps.laneHiAmt, ps.laneHi >= 0 ? 1 : 0, 6, dt)
    ps.cursorX = analyzerX(cursorYear(F))
    ps.flowSpeed = 1 + frame.load * 1.5 + sys.overclock * 2

    // Fare: imleç ışınından uzaklaştırma
    ndc.set(frame.pointer.nx, frame.pointer.ny)
    raycaster.setFromCamera(ndc, camera)
    ps.rayO.copy(raycaster.ray.origin)
    ps.rayD.copy(raycaster.ray.direction)
    const scaleW = world === 'board' ? 1 : world === 'city' ? 6 : 3.2
    ps.mouse = frame.pointer.inside && power !== 'off' ? 18 * scaleW * motion : 0
    ps.mouseR = 0.55 * scaleW

    motesState.box = world === 'board' ? 9 : world === 'city' ? 70 : 40
    motesState.size = world === 'board' ? 0.0035 : world === 'city' ? 0.05 : 0.03
    motesState.bright = world === 'board' ? 0.22 : 0.4
    labels.update(camera, world, power === 'on' ? F : power === 'booting' ? bt - BOOT.end : -100, state.size.width, state.size.height)
  }, -10)

  return null
}



function computeFilmShot(F: number, out: Pose, tmp: Pose, terrain: { pos: THREE.CatmullRomCurve3; tgt: THREE.CatmullRomCurve3 }) {
  const S = BOARD_SHOTS
  if (F < 0.72) {
    mixPose(S.hero, S.hero, 0, out)
    out.pos.x += Math.sin(F * 3) * 0.6
    return
  }
  if (F < 1.0) return mixPose(S.hero, S.preDive, smootherstep(0.72, 1.0, F), out)
  if (F < 1.2) {
    const t = invLerp(1.0, 1.2, F)
    return mixPose(S.preDive, S.dive, 1 - Math.pow(1 - t, 2.2) * (1 - t * 0.0), out)
  }
  // Silikon şehir
  if (F < 1.36) return mixPose(CITY.entry, CITY.low, smootherstep(1.2, 1.36, F), out)
  if (F < 2.0) return curvePose(CITY.fly.pos, CITY.fly.tgt, smootherstep(1.36, 2.0, F), 34, 26, out)
  if (F < 2.22) {
    CITY.fly.pos.getPoint(1, tmp.pos)
    CITY.fly.tgt.getPoint(1, tmp.target)
    tmp.fov = 34
    tmp.range = 26
    return mixPose(tmp, CITY.overview, smootherstep(2.0, 2.22, F), out)
  }
  if (F < 2.86) {
    mixPose(CITY.overview, CITY.overview, 0, out)
    const a = lerp(-0.16, 0.16, smootherstep(2.22, 2.86, F))
    out.pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), a)
    return out
  }
  if (F < 3.05) {
    const o = mixPose(CITY.overview, CITY.overview, 0, tmp)
    o.pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.16)
    return mixPose(o, CITY.street, smootherstep(2.86, 3.04, F), out)
  }
  // Zamanlayıcı
  if (F < 3.15) return mixPose(SCHED.entry, SCHED.a, smootherstep(3.05, 3.15, F), out)
  if (F < 3.9) return mixPose(SCHED.a, SCHED.b, smootherstep(3.15, 3.9, F), out)
  if (F < 4.04) return mixPose(SCHED.b, SCHED.exit, smootherstep(3.9, 4.04, F), out)
  // Mantık analizörü
  if (F < 5.04) {
    const cx = analyzerX(cursorYear(F))
    const base = P(V(cx + 1, 16.5, 24.5), V(cx + 2, 1.6, 0.8), 34, 20)
    if (F < 4.12) {
      const entry = P(V(cx - 14, 30, 50), V(cx + 1, 0, 0), 34, 40)
      return mixPose(entry, base, smootherstep(4.04, 4.12, F), out)
    }
    if (F > 4.93) {
      const exit = P(V(cx + 2, 38, 38), V(cx + 5, 0, -2), 34, 40)
      return mixPose(base, exit, smootherstep(4.93, 5.04, F), out)
    }
    return mixPose(base, base, 0, out)
  }
  // Türkiye haritası
  if (F < 6.04) return curvePose(terrain.pos, terrain.tgt, flightT(F), 36, 22, out)
  // Kapanış: karta dönüş
  if (F < 6.6) {
    const entry = P(V(0.6, 40, 30), V(-0.4, 0, 0.4), 34, 26)
    if (F < 6.12) return mixPose(entry, S.shutdown, smootherstep(6.04, 6.12, F), out)
    mixPose(S.shutdown, S.shutdown, 0, out)
    out.pos.y -= smootherstep(6.12, 6.6, F) * 3
    return out
  }
  return mixPose(S.shutdown, S.collapse, smootherstep(6.6, 6.86, F), out)
}

const fogColorBoard = new THREE.Color('#05070b')

function applyAtmosphere(world: WorldId, pres: number, scene: THREE.Scene) {
  const fog = scene.fog as THREE.FogExp2 | null
  if (fog) {
    fog.color.copy(fogColorBoard)
    fog.density = world === 'board' ? lerp(0.9, 0.0035, pres) : 0.9
  }
  const cfg: Record<WorldId, [string, number, number]> = {
    board: ['#05070b', 0.01, 0.1],
    city: ['#0a1428', 0.0105, 0.11],
    sched: ['#070d1a', 0.012, 0.2],
    analyzer: ['#070c18', 0.011, 0.15],
    terrain: ['#060a14', 0.0075, 0.06],
  }
  const [c, d, h] = cfg[world]
  // Görünürlük düştükçe sis rengi gece siyahına yaklaşır: kesmelerde renk sıçraması olmaz
  shared.uFogColor.value.set(c).lerp(fogColorBoard, 1 - pres)
  shared.uFogDensity.value = lerp(0.6, d, pres)
  shared.uFogHeightFalloff.value = h
  if (scene.background instanceof THREE.Color) scene.background.copy(shared.uFogColor.value)
}


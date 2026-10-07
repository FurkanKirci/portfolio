import * as THREE from 'three'
import { rng } from '@/lib/math'
import { glowTraces, BOARD, DIE } from '../board/layout'
import { floorplan } from '../city/floorplan'
import { BOARD_SHOTS } from '../shots'
import { heightAt, sample, uvToXZ, type TerrainData } from '../terrain/data'

/**
 * CPU tarafında üretilen formasyon dokuları. Her biri N*N parçacığın hedefini (veya akış parçasını) tutar.
 * Akış formasyonları iki dokuyla tanımlanır: A = başlangıç + hız, B = bitiş + parlaklık.
 */

type Seg = { ax: number; ay: number; az: number; bx: number; by: number; bz: number; len: number; w: number }

function pickWeighted<T extends Seg>(segs: T[], r: () => number) {
  const total = segs.reduce((s, x) => s + x.w, 0)
  const cdf: number[] = []
  let acc = 0
  for (const s of segs) {
    acc += s.w / total
    cdf.push(acc)
  }
  return () => {
    const x = r()
    let lo = 0
    let hi = cdf.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cdf[mid] < x) lo = mid + 1
      else hi = mid
    }
    return segs[lo]
  }
}

export function boardFlow(N: number) {
  const r = rng(11)
  // grup: [yoğunluk, hız cm/sn]
  const weights = {
    power: [1.0, 1.6],
    vcore: [0.9, 1.2],
    clock: [2.2, 3.2],
    ddr: [1.1, 2.6],
    pcie: [0.9, 2.8],
    m2: [0.7, 2.6],
    dmi: [0.7, 2.2],
    pson: [0.8, 2.0],
    pwrsw: [0.8, 2.0],
  } as const
  type G = keyof typeof weights
  const segs: (Seg & { speed: number })[] = []
  for (const t of glowTraces(Object.keys(weights) as G[])) {
    const [dens, speed] = weights[t.group as G]
    for (let i = 1; i < t.pts.length; i++) {
      const [ax, az] = t.pts[i - 1]
      const [bx, bz] = t.pts[i]
      const len = Math.hypot(bx - ax, bz - az)
      if (len < 0.02) continue
      segs.push({ ax, ay: 0.014, az, bx, by: 0.014, bz, len, w: len * dens * (0.5 + t.width * 8), speed })
    }
  }
  const pick = pickWeighted(segs, r)
  const a = new Float32Array(N * N * 4)
  const b = new Float32Array(N * N * 4)
  for (let i = 0; i < N * N; i++) {
    const s = pick()
    a.set([s.ax, s.ay, s.az, s.speed / s.len], i * 4)
    b.set([s.bx, s.by, s.bz, 0.55 + r() * 0.6], i * 4)
  }
  return { a, b }
}

export function cityFlow(N: number, density = 1) {
  const r = rng(29)
  const fp = floorplan(density)
  const segs: (Seg & { speed: number; lane: number })[] = []
  for (const st of fp.streets) {
    const len = Math.hypot(st.bx - st.ax, st.bz - st.az)
    if (len < 0.4) continue
    const lanes = st.w > 0.8 ? 2 : 1
    const ux = (st.bx - st.ax) / len
    const uz = (st.bz - st.az) / len
    for (let k = 0; k < lanes * 2; k++) {
      const side = k % 2 === 0 ? 1 : -1
      const off = side * st.w * (0.14 + 0.16 * Math.floor(k / 2))
      const nx = -uz * off
      const nz = ux * off
      const fwd = side > 0
      segs.push({
        ax: (fwd ? st.ax : st.bx) + nx,
        ay: 0.1,
        az: (fwd ? st.az : st.bz) + nz,
        bx: (fwd ? st.bx : st.ax) + nx,
        by: 0.1,
        bz: (fwd ? st.bz : st.az) + nz,
        len,
        w: len * (0.25 + st.weight),
        speed: 2.6 + st.weight * 3.2,
        lane: k,
      })
    }
  }
  const pick = pickWeighted(segs, r)
  const a = new Float32Array(N * N * 4)
  const b = new Float32Array(N * N * 4)
  for (let i = 0; i < N * N; i++) {
    const s = pick()
    const warm = r() < 0.07
    const bright = 0.45 + r() * 0.75
    a.set([s.ax, s.ay, s.az, (s.speed * (0.8 + r() * 0.4)) / s.len], i * 4)
    b.set([s.bx, s.by, s.bz, warm ? bright + 10 : bright], i * 4)
  }
  return { a, b }
}

/** "MFK" yazısı: kahraman kadrajına dönük bir düzlemde, kartın üzerinde süzülür. */
export function logoForm(N: number, text = 'MFK') {
  const r = rng(5)
  const W = 1200
  const H = 420
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `500 ${H * 0.86}px "Instrument Sans Variable", ui-sans-serif, sans-serif`
  ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${H * 0.02}px`
  ctx.fillText(text, W / 2, H / 2 + H * 0.04)
  const img = ctx.getImageData(0, 0, W, H).data
  const pts: number[] = []
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (img[(y * W + x) * 4] > 140) pts.push(x, y)
    }
  }
  const hero = BOARD_SHOTS.hero
  const f = new THREE.Vector3().subVectors(hero.target, hero.pos).normalize()
  const right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize()
  const up = new THREE.Vector3().crossVectors(right, f).normalize()
  // Logo, SoC'nin hemen üzerinde, kahraman kamerasına dönük bir hologram gibi durur
  const height = 3.6
  const die = new THREE.Vector3(DIE.x, DIE.y, DIE.z)
  const center = die.clone().addScaledVector(up, height * 0.72).addScaledVector(f, -0.6)
  const scale = height / H
  const out = new Float32Array(N * N * 4)
  const count = pts.length / 2
  for (let i = 0; i < N * N; i++) {
    const k = Math.floor(r() * count)
    const px = pts[k * 2] + (r() - 0.5) * 2
    const py = pts[k * 2 + 1] + (r() - 0.5) * 2
    const lx = (px - W / 2) * scale
    const ly = -(py - H / 2) * scale
    const depth = (r() - 0.5) * 0.25
    const p = center.clone().addScaledVector(right, lx).addScaledVector(up, ly).addScaledVector(f, depth)
    out.set([p.x, p.y, p.z, 0.9 + r() * 0.5], i * 4)
  }
  return out
}

/** Türkiye arazisi: kara üzerinde yükseltiye oturan noktalar; komşular soluk. */
export function terrainForm(N: number, t: TerrainData) {
  const r = rng(19)
  const out = new Float32Array(N * N * 4)
  let i = 0
  let guard = 0
  while (i < N * N && guard < N * N * 40) {
    guard++
    const u = r()
    const v = r()
    const land = sample(t, u, v, 2)
    if (land < 0.5) continue
    const tr = sample(t, u, v, 1)
    const accept = tr > 0.5 ? 1 : 0.12
    if (r() > accept) continue
    const [x, z] = uvToXZ(u, v)
    const h = heightAt(t, u, v)
    const bright = tr > 0.5 ? 0.55 + 0.45 * Math.min(1, h / 2.4) : 0.16
    out.set([x, h + 0.05, z, bright], i * 4)
    i++
  }
  for (; i < N * N; i++) out.set([0, -50, 0, 0], i * 4)
  return out
}

export function seedTexture(N: number) {
  const r = rng(3)
  const d = new Float32Array(N * N * 4)
  for (let i = 0; i < d.length; i++) d[i] = r()
  return d
}

export function initPositions(N: number, anchor: [number, number, number]) {
  const r = rng(8)
  const d = new Float32Array(N * N * 4)
  for (let i = 0; i < N * N; i++) {
    d.set([anchor[0] + (r() - 0.5) * 0.03, anchor[1] + (r() - 0.5) * 0.03, anchor[2] + (r() - 0.5) * 0.03, 0], i * 4)
  }
  return d
}

export const BOARD_HALF = { w: BOARD.w / 2, d: BOARD.d / 2 }

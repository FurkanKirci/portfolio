import { rng } from '@/lib/math'

/**
 * Silikon kalıbın kat planı: çekirdekler, önbellekler, bellek denetleyicisi, G/Ç halkası.
 * Aynı plan iki yerde kullanılır: anakarttaki çipin yüzey dokusu ve içine dalınan 3B "gece şehri".
 * Bu sayede çipe yaklaşırken gördüğün desen, şehre geçtiğinde birebir aynı kalır.
 */

export const DIE_SIZE = { w: 96, d: 72 }

export const BKind = {
  Logic: 0,
  Sram: 1,
  Analog: 2,
  Tower: 3,
  Pad: 4,
} as const
export type BKind = (typeof BKind)[keyof typeof BKind]

export interface Building {
  x: number
  z: number
  w: number
  d: number
  h: number
  kind: BKind
  /** 0..5 çekirdekler, 6 L3, 7 bellek denetleyicisi, 8 G/Ç */
  district: number
  seed: number
}

export interface Street {
  ax: number
  az: number
  bx: number
  bz: number
  w: number
  weight: number
}

export interface District {
  id: number
  x0: number
  z0: number
  x1: number
  z1: number
  tower: [number, number, number]
}

export interface Floorplan {
  buildings: Building[]
  streets: Street[]
  districts: District[]
}

const CORE_X: [number, number][] = [
  [-35, -12.6],
  [-11.4, 11.4],
  [12.6, 35],
]

export function buildFloorplan(density = 1, seed = 2610): Floorplan {
  const r = rng(seed)
  const buildings: Building[] = []
  const streets: Street[] = []
  const districts: District[] = []
  const minLot = 2.3 / Math.sqrt(Math.max(0.4, density))

  const street = (ax: number, az: number, bx: number, bz: number, w: number, weight: number) =>
    streets.push({ ax, az, bx, bz, w, weight })

  const pushBuilding = (b: Omit<Building, 'seed'>) => buildings.push({ ...b, seed: r() })

  /** Tek bir arsayı 1-4 binaya böler. */
  const lot = (x0: number, z0: number, x1: number, z1: number, district: number, heightAt: (x: number, z: number) => number) => {
    const set = 0.07
    const w = x1 - x0
    const d = z1 - z0
    const splitX = w > 1.4 && r() < 0.55 ? 2 : 1
    const splitZ = d > 1.4 && r() < 0.45 ? 2 : 1
    const gx = 0.09
    for (let i = 0; i < splitX; i++) {
      for (let j = 0; j < splitZ; j++) {
        const bx0 = x0 + (w / splitX) * i + (i > 0 ? gx / 2 : set)
        const bx1 = x0 + (w / splitX) * (i + 1) - (i < splitX - 1 ? gx / 2 : set)
        const bz0 = z0 + (d / splitZ) * j + (j > 0 ? gx / 2 : set)
        const bz1 = z0 + (d / splitZ) * (j + 1) - (j < splitZ - 1 ? gx / 2 : set)
        if (bx1 - bx0 < 0.25 || bz1 - bz0 < 0.25) continue
        const cx = (bx0 + bx1) / 2
        const cz = (bz0 + bz1) / 2
        pushBuilding({ x: cx, z: cz, w: bx1 - bx0, d: bz1 - bz0, h: heightAt(cx, cz), kind: BKind.Logic, district })
      }
    }
  }

  const bsp = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    depth: number,
    district: number,
    heightAt: (x: number, z: number) => number,
  ) => {
    const w = x1 - x0
    const d = z1 - z0
    if ((w < minLot && d < minLot) || depth > 10 || (w * d < minLot * minLot * 1.6 && r() < 0.35)) {
      lot(x0, z0, x1, z1, district, heightAt)
      return
    }
    const gap = depth < 1 ? 0.62 : depth < 3 ? 0.4 : 0.24
    const t = 0.36 + r() * 0.28
    const weight = 1 / (depth + 1.2)
    if (w >= d) {
      const cx = x0 + w * t
      street(cx, z0, cx, z1, gap, weight)
      bsp(x0, z0, cx - gap / 2, z1, depth + 1, district, heightAt)
      bsp(cx + gap / 2, z0, x1, z1, depth + 1, district, heightAt)
    } else {
      const cz = z0 + d * t
      street(x0, cz, x1, cz, gap, weight)
      bsp(x0, z0, x1, cz - gap / 2, depth + 1, district, heightAt)
      bsp(x0, cz + gap / 2, x1, z1, depth + 1, district, heightAt)
    }
  }

  /** Düzenli SRAM dizisi: aynı boyda, alçak bloklar. */
  const sram = (x0: number, z0: number, x1: number, z1: number, district: number, cell = 1.05, gap = 0.22) => {
    const nx = Math.max(1, Math.floor((x1 - x0 + gap) / (cell + gap)))
    const nz = Math.max(1, Math.floor((z1 - z0 + gap) / (cell * 0.72 + gap)))
    const cw = (x1 - x0 - gap * (nx - 1)) / nx
    const cd = (z1 - z0 - gap * (nz - 1)) / nz
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const x = x0 + i * (cw + gap) + cw / 2
        const z = z0 + j * (cd + gap) + cd / 2
        pushBuilding({ x, z, w: cw, d: cd, h: 0.5 + r() * 0.06, kind: BKind.Sram, district })
      }
      if (i > 0 && i % 6 === 0) street(x0 + i * (cw + gap) - gap / 2, z0, x0 + i * (cw + gap) - gap / 2, z1, gap, 0.25)
    }
    for (let j = 1; j < nz; j += 4) street(x0, z0 + j * (cd + gap) - gap / 2, x1, z0 + j * (cd + gap) - gap / 2, gap, 0.2)
  }

  /** Analog / G/Ç blokları: seyrek, geniş, alçak. */
  const analog = (x0: number, z0: number, x1: number, z1: number, district: number) => {
    let z = z0
    while (z < z1 - 0.8) {
      const d = 1.6 + r() * 3.2
      let x = x0
      while (x < x1 - 0.8) {
        const w = Math.min(x1 - x, 1.4 + r() * 3.4)
        const zz = Math.min(z1, z + d)
        if (r() < 0.85) {
          pushBuilding({
            x: x + w / 2,
            z: (z + zz) / 2,
            w: w - 0.35,
            d: zz - z - 0.35,
            h: 0.3 + r() * 0.9,
            kind: BKind.Analog,
            district,
          })
        }
        x += w
      }
      street(x0, z + d, x1, z + d, 0.35, 0.35)
      z += d
    }
  }

  /* ---------------------------------------------------------- çekirdekler */

  let coreId = 0
  for (const row of [0, 1]) {
    for (const [x0, x1] of CORE_X) {
      const top = row === 0
      const z0 = top ? -33 : 7
      const z1 = top ? -7 : 33
      const l2z0 = top ? -13.6 : 7
      const l2z1 = top ? -7 : 13.6
      const lz0 = top ? -33 : 14.2
      const lz1 = top ? -14.2 : 33
      // Kule konumu yoğunluktan bağımsız olsun (etiketler buna bağlı): ayrı tohum
      const id = coreId++
      const tr = rng(seed + 101 + id * 7)
      const tx = (x0 + x1) / 2 + (tr() - 0.5) * 3
      const tz = (lz0 + lz1) / 2 + (tr() - 0.5) * 3
      const th = 10 + tr() * 2.5
      const heightAt = (x: number, z: number) => {
        const dd = (x - tx) ** 2 + (z - tz) ** 2
        const downtown = 1 + 1.35 * Math.exp(-dd / 34)
        const base = 0.45 + Math.pow(r(), 2.4) * 3.8
        return r() < 0.035 ? (4.8 + r() * 3) * downtown * 0.8 : base * downtown
      }
      bsp(x0, lz0, x1, lz1, 0, id, heightAt)
      sram(x0 + 0.2, l2z0 + 0.2, x1 - 0.2, l2z1 - 0.2, id)
      street(x0, top ? -13.9 : 13.9, x1, top ? -13.9 : 13.9, 0.55, 0.9)
      // Her çekirdeğin simge kulesi (etiketler buraya bağlanır)
      pushBuilding({ x: tx, z: tz, w: 1.3, d: 1.3, h: th, kind: BKind.Tower, district: id })
      districts.push({ id, x0, z0, x1, z1, tower: [tx, th, tz] })
    }
  }

  /* ------------------------------------------------- L3 önbellek bandı */

  for (const [x0, x1] of CORE_X) {
    sram(x0 + 0.3, -4.6, x1 - 0.3, -0.4, 6, 1.1, 0.25)
    sram(x0 + 0.3, 0.4, x1 - 0.3, 4.6, 6, 1.1, 0.25)
  }
  districts.push({ id: 6, x0: -35, z0: -4.6, x1: 35, z1: 4.6, tower: [0, 1.2, 0] })

  /* ---------------------------------- bellek denetleyicisi ve G/Ç sütunları */

  analog(-45.2, -33, -37.6, 33, 7)
  analog(37.6, -33, 45.2, 33, 8)
  districts.push({ id: 7, x0: -45.2, z0: -33, x1: -37.6, z1: 33, tower: [-41.4, 1.2, 0] })
  districts.push({ id: 8, x0: 37.6, z0: -33, x1: 45.2, z1: 33, tower: [41.4, 1.2, 0] })

  /* -------------------------------------------------- G/Ç pedleri halkası */

  const padPitch = 1.45
  for (let x = -46.5; x <= 46.5; x += padPitch) {
    pushBuilding({ x, z: -35.0, w: 0.8, d: 0.9, h: 0.22, kind: BKind.Pad, district: 8 })
    pushBuilding({ x, z: 35.0, w: 0.8, d: 0.9, h: 0.22, kind: BKind.Pad, district: 8 })
  }
  for (let z = -33.5; z <= 33.5; z += padPitch) {
    pushBuilding({ x: -47.0, z, w: 0.9, d: 0.8, h: 0.22, kind: BKind.Pad, district: 7 })
    pushBuilding({ x: 47.0, z, w: 0.9, d: 0.8, h: 0.22, kind: BKind.Pad, district: 8 })
  }

  /* --------------------------------------------------------- ana yollar */

  // Halka veri yolu: iki otoyol
  street(-46.2, -5.85, 46.2, -5.85, 1.05, 3.2)
  street(-46.2, 5.85, 46.2, 5.85, 1.05, 3.2)
  street(-35.6, 0, 35.6, 0, 0.6, 1.4)
  for (const x of [-36.3, -12, 12, 36.3]) street(x, -34.2, x, 34.2, 0.9, 1.8)
  street(-46.2, -34.2, 46.2, -34.2, 0.8, 1.2)
  street(-46.2, 34.2, 46.2, 34.2, 0.8, 1.2)
  street(-46.2, -34.2, -46.2, 34.2, 0.8, 1.2)
  street(46.2, -34.2, 46.2, 34.2, 0.8, 1.2)

  return { buildings, streets, districts }
}

const cache = new Map<number, Floorplan>()
export function floorplan(density = 1) {
  const key = Math.round(density * 100)
  let fp = cache.get(key)
  if (!fp) {
    fp = buildFloorplan(density)
    cache.set(key, fp)
  }
  return fp
}

/**
 * Kat planını 2B tuvale çizer: koyu çatılar, ışıyan yollar, parlak pedler.
 * Uzaktan, gece uydu görüntüsü gibi görünür. Hem çip dokusu hem şehir zemini için kullanılır.
 */
export function drawFloorplan(
  ctx: CanvasRenderingContext2D,
  fp: Floorplan,
  W: number,
  H: number,
  opts: { roofs: boolean; glow: number; base: string; streetColor: string; padColor: string },
) {
  const sx = W / DIE_SIZE.w
  const sz = H / DIE_SIZE.d
  const X = (x: number) => (x + DIE_SIZE.w / 2) * sx
  const Z = (z: number) => (z + DIE_SIZE.d / 2) * sz

  ctx.fillStyle = opts.base
  ctx.fillRect(0, 0, W, H)

  // Yol ışıkları (ışıma için iki geçiş: geniş yumuşak + ince parlak)
  ctx.lineCap = 'round'
  for (const pass of [0, 1]) {
    for (const s of fp.streets) {
      const a = Math.min(1, 0.25 + s.weight * 0.4)
      ctx.strokeStyle = opts.streetColor
      ctx.globalAlpha = pass === 0 ? a * 0.22 * opts.glow : a * 0.9
      ctx.lineWidth = pass === 0 ? Math.max(2, s.w * sx * 3.2) : Math.max(0.7, s.w * sx * 0.35)
      ctx.beginPath()
      ctx.moveTo(X(s.ax), Z(s.az))
      ctx.lineTo(X(s.bx), Z(s.bz))
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1

  if (opts.roofs) {
    for (const b of fp.buildings) {
      const shade = b.kind === BKind.Sram ? 22 : b.kind === BKind.Analog ? 17 : 13 + Math.min(10, b.h * 2)
      ctx.fillStyle = b.kind === BKind.Pad ? opts.padColor : `rgb(${shade - 4},${shade},${shade + 9})`
      ctx.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), Math.max(1, b.w * sx), Math.max(1, b.d * sz))
      if (b.kind === BKind.Tower) {
        ctx.fillStyle = opts.streetColor
        ctx.globalAlpha = 0.9
        const s = Math.max(1.5, 0.3 * sx)
        ctx.fillRect(X(b.x) - s / 2, Z(b.z) - s / 2, s, s)
        ctx.globalAlpha = 1
      }
    }
  }
}

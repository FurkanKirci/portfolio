import { rng } from '@/lib/math'

/**
 * MFK-B26: prosedürel anakart yerleşimi. Birim: santimetre. Kart merkezde, üst yüzey y = 0.
 * x sağa, z izleyiciye doğru (güney). Her şey deterministik: aynı tohum, aynı kart.
 */

export const BOARD = { w: 26, d: 19, t: 0.16 }
export const DIE = { x: -2.5, z: -1.0, w: 2.0, d: 1.5, y: 0.2 }

export type PartKind =
  | 'soc'
  | 'dram'
  | 'choke'
  | 'mosfet'
  | 'pcap'
  | 'eps'
  | 'fanhdr'
  | 'qcode'
  | 'dbgled'
  | 'atx'
  | 'xtal'
  | 'bios'
  | 'sio'
  | 'lan'
  | 'shroud'
  | 'm2'
  | 'pcie'
  | 'pwrsw'
  | 'sbled'
  | 'battery'
  | 'fpanel'
  | 'hole'
  | 'qfn'

export interface Part {
  kind: PartKind
  ref: string
  x: number
  z: number
  w: number
  d: number
  h: number
  label?: string
  /** serigrafi üzerinde gösterilen etiket */
  silk?: string
}

export type TraceGroup = 'pwrsw' | 'pson' | 'power' | 'vcore' | 'clock' | 'ddr' | 'pcie' | 'm2' | 'dmi' | 'misc'

export interface Trace {
  pts: [number, number][]
  width: number
  group: TraceGroup
}

export interface Smd {
  x: number
  z: number
  len: number
  wid: number
  h: number
  rot: number
  /** 0: MLCC kondansatör, 1: direnç */
  kind: 0 | 1
}

export interface BoardLayout {
  parts: Part[]
  traces: Trace[]
  pours: [number, number][][]
  smd: Smd[]
  vias: [number, number][]
  anchors: Record<'led' | 'button' | 'xtal' | 'die' | 'fan' | 'qcode' | 'atx' | 'sio' | 'm2' | 'pcie', [number, number, number]>
}

type P = [number, number]

/** Bir yolu ortalayan n paralel iz üretir (köşelerde gönye ile). */
function bus(path: P[], n: number, pitch: number): P[][] {
  const out: P[][] = []
  const normals: P[] = []
  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1][0] - path[i][0]
    const dz = path[i + 1][1] - path[i][1]
    const l = Math.hypot(dx, dz) || 1
    normals.push([-dz / l, dx / l])
  }
  for (let k = 0; k < n; k++) {
    const off = (k - (n - 1) / 2) * pitch
    const line: P[] = []
    for (let i = 0; i < path.length; i++) {
      let nx: number, nz: number
      if (i === 0) [nx, nz] = normals[0]
      else if (i === path.length - 1) [nx, nz] = normals[normals.length - 1]
      else {
        const a = normals[i - 1]
        const b = normals[i]
        nx = a[0] + b[0]
        nz = a[1] + b[1]
        const l = Math.hypot(nx, nz) || 1
        nx /= l
        nz /= l
        const c = Math.max(0.5, nx * a[0] + nz * a[1])
        nx /= c
        nz /= c
      }
      line.push([path[i][0] + nx * off, path[i][1] + nz * off])
    }
    out.push(line)
  }
  return out
}

/** Düz bir parçaya uzunluk eşitleme kıvrımı (serpantin) ekler. */
function serpentine(a: P, b: P, amp: number, pitch: number): P[] {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const l = Math.hypot(dx, dz)
  const ux = dx / l
  const uz = dz / l
  const nx = -uz
  const nz = ux
  const pts: P[] = [a]
  const steps = Math.floor(l / pitch)
  for (let i = 1; i < steps; i++) {
    const t = i * pitch
    const s = i % 2 === 0 ? 1 : -1
    const bx = a[0] + ux * t
    const bz = a[1] + uz * t
    pts.push([bx + nx * amp * s, bz + nz * amp * s])
    pts.push([bx + ux * pitch * 0.5 + nx * amp * s, bz + uz * pitch * 0.5 + nz * amp * s])
  }
  pts.push(b)
  return pts
}

export function buildBoardLayout(seed = 2603): BoardLayout {
  const r = rng(seed)
  const parts: Part[] = []
  const traces: Trace[] = []
  const pours: P[][] = []
  const smd: Smd[] = []
  const vias: P[] = []
  const add = (p: Part) => parts.push(p)
  const addBus = (path: P[], n: number, pitch: number, width: number, group: TraceGroup) => {
    for (const pts of bus(path, n, pitch)) traces.push({ pts, width, group })
  }

  /* ---------------------------------------------------------------- parçalar */

  // SoC: çıplak kalıplı paket (kalıp üstte, alt tabaka koyu)
  add({ kind: 'soc', ref: 'U1', x: DIE.x, z: DIE.z, w: 4.4, d: 4.4, h: 0.12, label: 'MFK-SoC', silk: 'U1' })

  // LPDDR5 paketleri
  const dramPos: P[] = [
    [-7.75, -2.35],
    [-7.75, 0.35],
    [2.75, -2.35],
    [2.75, 0.35],
  ]
  dramPos.forEach(([x, z], i) => add({ kind: 'dram', ref: `U${2 + i}`, x, z, w: 1.4, d: 1.75, h: 0.11, label: 'D5 16G', silk: `U${2 + i}` }))

  // VRM: bobinler, güç katları, polimer kondansatörler
  for (let i = 0; i < 8; i++) {
    const x = -7.0 + i * 1.22
    add({ kind: 'choke', ref: `L${i + 1}`, x, z: -5.55, w: 0.86, d: 0.86, h: 0.58, label: 'R22', silk: `L${i + 1}` })
    add({ kind: 'mosfet', ref: `Q${i + 1}`, x, z: -4.42, w: 0.56, d: 0.5, h: 0.1 })
    add({ kind: 'pcap', ref: `C${101 + i}`, x: x + (i % 2 ? 0.18 : -0.18), z: -6.95, w: 0.64, d: 0.64, h: 0.86 })
  }
  add({ kind: 'qfn', ref: 'U9', x: 3.35, z: -4.4, w: 0.7, d: 0.7, h: 0.08, label: 'PWM', silk: 'U9' })

  add({ kind: 'eps', ref: 'J2', x: -10.75, z: -7.75, w: 2.1, d: 0.95, h: 1.02, silk: 'EPS_8P' })
  add({ kind: 'fanhdr', ref: 'J5', x: 5.1, z: -7.7, w: 1.02, d: 0.26, h: 0.62, silk: 'CPU_FAN' })

  // Q-Code ekranı + hata ayıklama LED'leri
  add({ kind: 'qcode', ref: 'DS1', x: 6.35, z: -2.15, w: 1.3, d: 0.92, h: 0.34, silk: 'Q-CODE' })
  ;['CPU', 'DRAM', 'VGA', 'BOOT'].forEach((s, i) =>
    add({ kind: 'dbgled', ref: `D${2 + i}`, x: 5.95 + i * 0.32, z: -1.25, w: 0.16, d: 0.08, h: 0.05, silk: s }),
  )

  // 24 pinli ATX besleme konnektörü (sağ kenar boyunca dikey)
  add({ kind: 'atx', ref: 'J1', x: 11.75, z: -2.0, w: 1.02, d: 6.2, h: 1.42, silk: 'ATX_24P' })

  // Saat: HC-49 kristal + yük kondansatörleri
  add({ kind: 'xtal', ref: 'X1', x: 3.45, z: 2.55, w: 1.16, d: 0.46, h: 0.36, label: '25.000', silk: 'X1 25.000MHz' })

  add({ kind: 'bios', ref: 'U7', x: 5.55, z: 2.85, w: 0.52, d: 0.62, h: 0.16, label: '25Q256', silk: 'BIOS' })
  add({ kind: 'sio', ref: 'U8', x: 8.75, z: 2.6, w: 1.25, d: 1.25, h: 0.14, label: 'MFK-EC 26', silk: 'U8' })
  add({ kind: 'lan', ref: 'U10', x: 9.35, z: -4.6, w: 0.8, d: 0.8, h: 0.09, label: 'MFK-NET', silk: 'LAN' })

  // Yonga seti: fanlı soğutucu örtüsü
  add({ kind: 'shroud', ref: 'FAN1', x: 5.7, z: 6.0, w: 4.3, d: 4.3, h: 0.78, silk: 'CHA_FAN' })

  // M.2 NVMe SSD
  add({ kind: 'm2', ref: 'M2_1', x: -6.3, z: 4.45, w: 8.0, d: 2.2, h: 0.24, label: 'MFK NVMe', silk: 'M.2_1 (PCIE 4.0 x4)' })

  // PCIe x16 yuvası
  add({ kind: 'pcie', ref: 'J7', x: -7.05, z: 7.95, w: 8.9, d: 0.76, h: 1.12, silk: 'PCIEX16_1' })

  // Güç düğmesi ve bekleme LED'i
  add({ kind: 'pwrsw', ref: 'SW1', x: 10.1, z: 7.55, w: 0.82, d: 0.82, h: 0.36, silk: 'PWR_SW' })
  add({ kind: 'sbled', ref: 'LED1', x: 11.0, z: 7.95, w: 0.17, d: 0.09, h: 0.06, silk: 'SB_PWR' })

  add({ kind: 'battery', ref: 'BT1', x: 0.6, z: 5.6, w: 2.0, d: 2.0, h: 0.34, label: 'CR2032', silk: 'BT1' })
  add({ kind: 'fpanel', ref: 'J9', x: 7.9, z: 8.75, w: 1.3, d: 0.52, h: 0.62, silk: 'F_PANEL' })

  // Montaj delikleri
  ;[
    [-12.25, -8.75],
    [12.25, -8.75],
    [-12.25, 8.75],
    [12.25, 8.75],
    [-2.5, 8.75],
  ].forEach(([x, z], i) => add({ kind: 'hole', ref: `H${i + 1}`, x, z, w: 0.62, d: 0.62, h: 0 }))

  /* ------------------------------------------------------------------- izler */

  // DDR veri yolları: SoC kenarından bellek paketlerine
  const socL = DIE.x - 2.2
  const socR = DIE.x + 2.2
  dramPos.forEach(([x, z], i) => {
    const left = x < DIE.x
    const fromX = left ? socL : socR
    const toX = left ? x + 0.7 : x - 0.7
    const zz = z + (i % 2 ? 0.1 : -0.1)
    const mid = (fromX + toX) / 2
    const path: P[] = [
      [fromX + (left ? -0.05 : 0.05), zz + (i % 2 ? 0.35 : -0.35)],
      [mid, zz + (i % 2 ? 0.35 : -0.35)],
      [mid + (left ? -0.3 : 0.3), zz],
      [toX, zz],
    ]
    addBus(path, 14, 0.072, 0.032, 'ddr')
  })
  // Bellek komut/adres hattı: daha uzun, kıvrımlı
  traces.push({ pts: serpentine([-4.9, 1.5], [-7.6, 1.5], 0.09, 0.2), width: 0.03, group: 'ddr' })
  traces.push({ pts: serpentine([-0.1, 1.5], [2.6, 1.5], 0.09, 0.2), width: 0.03, group: 'ddr' })

  // PCIe x16: SoC'nin altından yuvaya
  addBus(
    [
      [-3.2, 1.25],
      [-3.2, 2.6],
      [-5.0, 4.4],
      [-6.9, 4.4],
      [-8.6, 6.1],
      [-8.6, 7.55],
    ],
    24,
    0.085,
    0.034,
    'pcie',
  )
  // M.2: sola, konnektöre
  addBus(
    [
      [-4.75, 0.6],
      [-5.6, 0.6],
      [-7.9, 2.9],
      [-9.6, 2.9],
      [-10.35, 3.65],
      [-10.35, 4.3],
    ],
    8,
    0.085,
    0.034,
    'm2',
  )
  // DMI: SoC → yonga seti
  addBus(
    [
      [-0.35, 0.9],
      [1.0, 0.9],
      [2.4, 2.3],
      [2.4, 3.8],
      [3.6, 5.0],
      [3.75, 5.0],
    ],
    8,
    0.08,
    0.03,
    'dmi',
  )

  // Saat hattı: X1 → SoC (uzunluk eşitleme kıvrımıyla)
  traces.push({
    pts: [[2.85, 2.55], [2.3, 2.55], ...serpentine([2.3, 2.1], [0.4, 2.1], 0.11, 0.24), [0.0, 1.7], [-0.6, 1.3]],
    width: 0.04,
    group: 'clock',
  })
  traces.push({
    pts: [[4.05, 2.55], [4.6, 2.55], [4.6, 3.3], [5.2, 3.9], [5.2, 4.2]],
    width: 0.035,
    group: 'clock',
  })

  // Güç düğmesi → EC (Super I/O) → ATX PS_ON#
  traces.push({ pts: [[10.1, 7.1], [10.1, 5.6], [9.3, 4.8], [9.3, 3.3]], width: 0.05, group: 'pwrsw' })
  traces.push({ pts: [[9.4, 1.95], [9.4, 1.3], [10.6, 0.1], [10.6, -1.4], [11.25, -1.4]], width: 0.05, group: 'pson' })

  // Güç: ATX → VRM (geniş izler)
  for (let k = 0; k < 6; k++) {
    const z = -3.25 - k * 0.22
    traces.push({
      pts: [
        [11.25, z + 1.9],
        [10.6, z + 1.9],
        [10.2, z],
        [4.3, z],
        [3.9, z - 0.55],
        [2.2, z - 0.55],
      ],
      width: 0.15,
      group: 'power',
    })
  }
  // EPS 8 pin → VRM'in arkası
  traces.push({ pts: [[-10.75, -7.2], [-10.75, -6.6], [-10.1, -6.25], [1.9, -6.25]], width: 0.2, group: 'power' })
  traces.push({ pts: [[-10.35, -7.2], [-10.35, -6.95], [-9.7, -6.55], [-8.2, -6.55]], width: 0.12, group: 'power' })

  // Vcore dökümü: VRM → SoC
  pours.push([
    [-7.6, -4.05],
    [2.9, -4.05],
    [2.9, -3.6],
    [-0.1, -3.6],
    [-0.4, -3.3],
    [-4.6, -3.3],
    [-4.9, -3.6],
    [-7.6, -3.6],
  ])
  for (let i = 0; i < 8; i++) {
    const x = -7.0 + i * 1.22
    traces.push({ pts: [[x, -4.15], [x, -3.75], [x * 0.35 + DIE.x * 0.65, -3.35]], width: 0.12, group: 'vcore' })
  }

  // Yan bağlantılar: EC, LAN, BIOS, Q-Code, ön panel, fan, pil
  const misc: P[][] = [
    [[8.1, 2.6], [7.0, 2.6], [6.2, 3.4], [6.2, 3.8]],
    [[5.55, 2.5], [5.55, 1.6], [6.6, 0.55], [8.0, 0.55], [8.6, 1.95]],
    [[9.35, -4.1], [9.35, -3.0], [8.4, -2.05], [8.4, 1.3], [8.75, 1.95]],
    [[6.35, -1.7], [6.35, -0.7], [7.7, 0.65], [8.2, 1.9]],
    [[7.9, 8.45], [7.9, 7.5], [8.75, 6.6], [8.75, 3.25]],
    [[5.1, -7.55], [5.1, -6.7], [7.8, -4.0], [7.8, 0.4], [8.3, 1.95]],
    [[0.6, 4.6], [0.6, 4.1], [1.6, 3.1], [3.2, 3.1], [3.9, 3.8], [3.9, 4.6]],
    [[9.4, 3.3], [9.4, 4.0], [7.9, 5.5]],
    [[-1.0, -3.0], [3.0, -3.0], [3.6, -3.6], [3.6, -4.0]],
  ]
  misc.forEach((pts) => traces.push({ pts, width: 0.035, group: 'misc' }))
  addBus(
    [
      [8.75, 3.25],
      [8.75, 4.2],
      [7.95, 5.0],
    ],
    6,
    0.08,
    0.028,
    'misc',
  )

  // Entegrelerin etrafındaki kısa çıkış izleri (fan-out) ve vialar
  const fanout = (cx: number, cz: number, w: number, d: number, n: number, len: number) => {
    for (let s = 0; s < 4; s++) {
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n - 0.5
        let x0: number, z0: number, dx: number, dz: number
        if (s === 0) [x0, z0, dx, dz] = [cx + t * w, cz - d / 2, 0, -1]
        else if (s === 1) [x0, z0, dx, dz] = [cx + t * w, cz + d / 2, 0, 1]
        else if (s === 2) [x0, z0, dx, dz] = [cx - w / 2, cz + t * d, -1, 0]
        else [x0, z0, dx, dz] = [cx + w / 2, cz + t * d, 1, 0]
        const L = len * (0.5 + r() * 0.9)
        const bend = r() < 0.5 ? 1 : -1
        const x1 = x0 + dx * L * 0.6
        const z1 = z0 + dz * L * 0.6
        const x2 = x1 + (dx + (dx === 0 ? bend : 0)) * L * 0.4
        const z2 = z1 + (dz + (dz === 0 ? bend : 0)) * L * 0.4
        traces.push({ pts: [[x0, z0], [x1, z1], [x2, z2]], width: 0.022, group: 'misc' })
        vias.push([x2, z2])
      }
    }
  }
  fanout(8.75, 2.6, 1.25, 1.25, 7, 0.55)
  fanout(9.35, -4.6, 0.8, 0.8, 4, 0.5)
  fanout(5.55, 2.85, 0.52, 0.62, 2, 0.4)
  fanout(3.35, -4.4, 0.7, 0.7, 3, 0.45)

  // SoC altındaki güç via alanı ve VRM çevresi
  for (let i = 0; i < 160; i++) vias.push([DIE.x - 2.0 + r() * 4.0, DIE.z - 2.0 + r() * 4.0])
  for (let i = 0; i < 70; i++) vias.push([-7.6 + r() * 10.5, -4.0 + r() * 0.5])
  for (const t of traces) {
    if (t.group === 'misc' || t.group === 'clock') continue
    if (r() < 0.06) {
      const p = t.pts[Math.floor(r() * t.pts.length)]
      vias.push([p[0], p[1]])
    }
  }

  /* ----------------------------------------------------------- pasif SMD'ler */

  const occupied = (x: number, z: number, pad = 0.12) =>
    parts.some((p) => p.kind !== 'hole' && Math.abs(x - p.x) < p.w / 2 + pad && Math.abs(z - p.z) < p.d / 2 + pad)
  const placeSmd = (x: number, z: number, rot: number, big = false) => {
    if (Math.abs(x) > BOARD.w / 2 - 0.4 || Math.abs(z) > BOARD.d / 2 - 0.4) return
    if (occupied(x, z, 0.1)) return
    const kind: 0 | 1 = r() < 0.72 ? 0 : 1
    const len = big ? 0.2 : 0.16
    const wid = big ? 0.125 : 0.08
    smd.push({ x, z, len, wid, h: kind === 0 ? wid * 0.9 : 0.045, rot, kind })
  }

  // SoC alt tabakası üzerindeki kalıp çevresi kondansatörleri
  for (let i = 0; i < 18; i++) {
    const t = (i + 0.5) / 18
    for (const side of [-1, 1]) {
      smd.push({ x: DIE.x + (t - 0.5) * 3.4, z: DIE.z + side * 1.55, len: 0.12, wid: 0.06, h: 0.055, rot: Math.PI / 2, kind: 0 })
    }
  }
  for (let i = 0; i < 12; i++) {
    const t = (i + 0.5) / 12
    for (const side of [-1, 1]) {
      smd.push({ x: DIE.x + side * 1.75, z: DIE.z + (t - 0.5) * 2.6, len: 0.12, wid: 0.06, h: 0.055, rot: 0, kind: 0 })
    }
  }

  // SoC çevresinde kart üzerinde iki sıra dekuplaj
  for (let ring = 0; ring < 2; ring++) {
    const half = 2.42 + ring * 0.26
    const n = 26
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5
      placeSmd(DIE.x + t * 2 * half, DIE.z - half, 0)
      placeSmd(DIE.x + t * 2 * half, DIE.z + half, 0)
      placeSmd(DIE.x - half, DIE.z + t * 2 * half, Math.PI / 2)
      placeSmd(DIE.x + half, DIE.z + t * 2 * half, Math.PI / 2)
    }
  }
  // VRM sırası
  for (let i = 0; i < 8; i++) {
    const x = -7.0 + i * 1.22
    placeSmd(x - 0.32, -3.95, Math.PI / 2, true)
    placeSmd(x + 0.32, -3.95, Math.PI / 2, true)
    placeSmd(x, -6.25, 0)
  }
  // Belleklerin ve küçük entegrelerin yanı
  for (const [x, z] of dramPos) {
    for (let i = 0; i < 6; i++) placeSmd(x - 0.6 + i * 0.24, z + (z < -1 ? -1.1 : 1.1), 0)
  }
  const sprinkle = (cx: number, cz: number, rad: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2
      const d = rad * (0.45 + r() * 0.55)
      placeSmd(cx + Math.cos(a) * d, cz + Math.sin(a) * d, r() < 0.5 ? 0 : Math.PI / 2)
    }
  }
  sprinkle(8.75, 2.6, 1.6, 26)
  sprinkle(9.35, -4.6, 1.2, 16)
  sprinkle(3.45, 2.55, 1.0, 8)
  sprinkle(5.55, 2.85, 0.8, 6)
  sprinkle(10.3, 7.4, 1.1, 8)
  sprinkle(6.35, -2.15, 1.3, 10)
  sprinkle(-10.8, 2.0, 1.6, 20)
  sprinkle(-10.5, -3.0, 1.4, 16)
  sprinkle(0.4, -6.9, 1.2, 10)
  // Rastgele, boş alanlara serpiştirilmiş
  for (let i = 0; i < 520; i++) {
    const x = (r() - 0.5) * (BOARD.w - 1.4)
    const z = (r() - 0.5) * (BOARD.d - 1.4)
    if (r() < 0.55) placeSmd(x, z, r() < 0.5 ? 0 : Math.PI / 2)
  }
  // Yük kondansatörleri (kristalin iki yanı)
  smd.push({ x: 2.65, z: 2.95, len: 0.16, wid: 0.08, h: 0.075, rot: Math.PI / 2, kind: 0 })
  smd.push({ x: 4.25, z: 2.95, len: 0.16, wid: 0.08, h: 0.075, rot: Math.PI / 2, kind: 0 })

  const anchors: BoardLayout['anchors'] = {
    led: [11.0, 0.07, 7.95],
    button: [10.1, 0.36, 7.55],
    xtal: [3.45, 0.36, 2.55],
    die: [DIE.x, DIE.y, DIE.z],
    fan: [5.7, 0.78, 6.0],
    qcode: [6.35, 0.34, -2.15],
    atx: [11.75, 1.42, -2.0],
    sio: [8.75, 0.14, 2.6],
    m2: [-6.3, 0.24, 4.45],
    pcie: [-7.05, 1.12, 7.95],
  }

  return { parts, traces, pours, smd, vias, anchors }
}

let cached: BoardLayout | null = null
export function boardLayout() {
  if (!cached) cached = buildBoardLayout()
  return cached
}

/** Belirli gruplardaki izleri, uzunluklarıyla birlikte döner (parlama ve parçacık akışı için). */
export function glowTraces(groups: TraceGroup[]) {
  const { traces } = boardLayout()
  return traces
    .filter((t) => groups.includes(t.group))
    .map((t) => {
      let len = 0
      for (let i = 1; i < t.pts.length; i++) len += Math.hypot(t.pts[i][0] - t.pts[i - 1][0], t.pts[i][1] - t.pts[i - 1][1])
      return { ...t, len }
    })
}

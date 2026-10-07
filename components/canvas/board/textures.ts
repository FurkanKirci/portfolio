import * as THREE from 'three'
import { rng } from '@/lib/math'
import { drawFloorplan, floorplan } from '../city/floorplan'
import { BOARD, type BoardLayout, type Part } from './layout'

/**
 * Kartın dokuları tarayıcıda, tuval (canvas) üzerinde çizilir:
 *  - color: lehim maskesi, maskenin altından seçilen bakır izler, pedler, serigrafi, temas gölgeleri
 *  - data:  R = kabartma (bump), G = pürüzlülük, B = metaliklik (three.js'in kanal düzeniyle)
 */

const MONO = '"JetBrains Mono Variable", ui-monospace, monospace'
const SANS = '"Instrument Sans Variable", ui-sans-serif, sans-serif'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: false })!
  return { c, ctx }
}

function finish(tex: THREE.CanvasTexture, srgb: boolean, aniso: number) {
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  tex.anisotropy = aniso
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

export interface BoardTextures {
  color: THREE.CanvasTexture
  data: THREE.CanvasTexture
}

export function makeBoardTextures(layout: BoardLayout, size: number, aniso: number): BoardTextures {
  const W = size
  const H = Math.round((size * BOARD.d) / BOARD.w)
  const s = W / BOARD.w
  const X = (x: number) => (x + BOARD.w / 2) * s
  const Z = (z: number) => (z + BOARD.d / 2) * s
  const r = rng(77)

  const col = canvas(W, H)
  const dat = canvas(W, H)
  const c = col.ctx
  const d = dat.ctx

  /* ---- taban: koyu lacivert-siyah lehim maskesi, hafif kalınlık farkları ---- */
  c.fillStyle = '#090d13'
  c.fillRect(0, 0, W, H)
  for (let i = 0; i < 70; i++) {
    const x = r() * W
    const y = r() * H
    const rad = (0.8 + r() * 3.5) * s
    const g = c.createRadialGradient(x, y, 0, x, y, rad)
    const a = 0.025 + r() * 0.03
    g.addColorStop(0, r() < 0.5 ? `rgba(30,44,62,${a})` : `rgba(0,0,0,${a * 1.4})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = g
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
  d.fillStyle = 'rgb(0,96,0)'
  d.fillRect(0, 0, W, H)

  /* ---- bakır dökümler ve izler (maskenin altından hafifçe seçilir) ---- */
  const poly = (ctx: CanvasRenderingContext2D, pts: [number, number][]) => {
    ctx.beginPath()
    pts.forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Z(z)) : ctx.moveTo(X(x), Z(z))))
    ctx.closePath()
  }
  for (const p of layout.pours) {
    c.fillStyle = '#0e151e'
    poly(c, p)
    c.fill()
    d.fillStyle = 'rgb(26,92,0)'
    poly(d, p)
    d.fill()
  }
  c.lineJoin = d.lineJoin = 'round'
  c.lineCap = d.lineCap = 'round'
  for (const t of layout.traces) {
    const lw = Math.max(1, t.width * s)
    c.strokeStyle = t.group === 'power' || t.group === 'vcore' ? '#121b26' : '#111a25'
    c.lineWidth = lw
    d.strokeStyle = 'rgb(118,80,0)'
    d.lineWidth = lw
    for (const ctx of [c, d]) {
      ctx.beginPath()
      t.pts.forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Z(z)) : ctx.moveTo(X(x), Z(z))))
      ctx.stroke()
    }
  }
  // Vialar (çadırlı: üstü maskeyle kapalı küçük kabarcıklar)
  for (const [x, z] of layout.vias) {
    const rr = 0.048 * s
    c.fillStyle = '#1b232d'
    c.beginPath()
    c.arc(X(x), Z(z), rr, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#070a0e'
    c.beginPath()
    c.arc(X(x), Z(z), rr * 0.42, 0, Math.PI * 2)
    c.fill()
    d.fillStyle = 'rgb(160,80,0)'
    d.beginPath()
    d.arc(X(x), Z(z), rr, 0, Math.PI * 2)
    d.fill()
  }

  /* ---- temas gölgeleri (bileşenlerin karta oturduğu hissi) ---- */
  c.save()
  for (const p of layout.parts) {
    if (p.kind === 'hole') continue
    const blur = (0.12 + Math.min(1.2, p.h) * 0.55) * s
    c.shadowColor = 'rgba(0,0,0,0.9)'
    c.shadowBlur = blur
    c.fillStyle = 'rgba(0,0,0,0.75)'
    c.fillRect(X(p.x - p.w / 2), Z(p.z - p.d / 2), p.w * s, p.d * s)
  }
  c.shadowBlur = 0.06 * s
  for (const m of layout.smd) {
    c.save()
    c.translate(X(m.x), Z(m.z))
    c.rotate(m.rot)
    c.fillStyle = 'rgba(0,0,0,0.7)'
    c.fillRect((-m.len / 2) * s, (-m.wid / 2) * s, m.len * s, m.wid * s)
    c.restore()
  }
  c.restore()

  /* ---- açık metal: SMD pedleri, entegre pedleri, fidüsyeller, montaj halkaları ---- */
  const gold = '#a7884f'
  const pad = (x: number, z: number, w: number, h: number, rot = 0) => {
    for (const [ctx, style] of [
      [c, gold],
      [d, 'rgb(150,70,255)'],
    ] as const) {
      ctx.save()
      ctx.translate(X(x), Z(z))
      ctx.rotate(rot)
      ctx.fillStyle = style
      ctx.fillRect((-w / 2) * s, (-h / 2) * s, w * s, h * s)
      ctx.restore()
    }
  }
  for (const m of layout.smd) {
    const off = m.len * 0.42
    const cs = Math.cos(m.rot)
    const sn = Math.sin(m.rot)
    pad(m.x + cs * off, m.z + sn * off, m.len * 0.36, m.wid * 1.25, m.rot)
    pad(m.x - cs * off, m.z - sn * off, m.len * 0.36, m.wid * 1.25, m.rot)
  }
  const perimeterPads = (p: Part, n: number, len: number) => {
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5
      pad(p.x + t * p.w * 0.86, p.z - p.d / 2 - len / 2, 0.03, len)
      pad(p.x + t * p.w * 0.86, p.z + p.d / 2 + len / 2, 0.03, len)
      pad(p.x - p.w / 2 - len / 2, p.z + t * p.d * 0.86, len, 0.03)
      pad(p.x + p.w / 2 + len / 2, p.z + t * p.d * 0.86, len, 0.03)
    }
  }
  for (const p of layout.parts) {
    if (p.kind === 'sio') perimeterPads(p, 16, 0.12)
    if (p.kind === 'lan' || p.kind === 'qfn') perimeterPads(p, 8, 0.06)
    if (p.kind === 'bios') {
      for (let i = 0; i < 4; i++) {
        pad(p.x - p.w / 2 - 0.08, p.z - p.d * 0.36 + i * p.d * 0.24, 0.14, 0.05)
        pad(p.x + p.w / 2 + 0.08, p.z - p.d * 0.36 + i * p.d * 0.24, 0.14, 0.05)
      }
    }
    if (p.kind === 'hole') {
      for (const [ctx, outer, inner] of [
        [c, gold, '#020304'],
        [d, 'rgb(170,60,255)', 'rgb(0,200,0)'],
      ] as const) {
        ctx.fillStyle = outer
        ctx.beginPath()
        ctx.arc(X(p.x), Z(p.z), (p.w / 2) * s * 1.55, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = inner
        ctx.beginPath()
        ctx.arc(X(p.x), Z(p.z), (p.w / 2) * s * 0.92, 0, Math.PI * 2)
        ctx.fill()
      }
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2
        pad(p.x + Math.cos(a) * p.w * 0.62, p.z + Math.sin(a) * p.w * 0.62, 0.05, 0.05)
      }
    }
  }
  for (const [x, z] of [
    [-12.4, -6.2],
    [12.3, 5.6],
    [-0.6, -8.9],
  ]) {
    c.strokeStyle = '#1a2330'
    c.lineWidth = 0.03 * s
    c.beginPath()
    c.arc(X(x), Z(z), 0.12 * s, 0, Math.PI * 2)
    c.stroke()
    pad(x, z, 0.1, 0.1)
  }

  /* ---- serigrafi ---- */
  const silk = 'rgba(200,210,222,0.86)'
  const silkData = 'rgb(70,186,0)'
  const text = (str: string, x: number, z: number, size: number, opts: { rot?: number; align?: CanvasTextAlign; weight?: number; font?: string; tracking?: number } = {}) => {
    for (const [ctx, style] of [
      [c, silk],
      [d, silkData],
    ] as const) {
      ctx.save()
      ctx.translate(X(x), Z(z))
      ctx.rotate(opts.rot ?? 0)
      ctx.fillStyle = style
      ctx.font = `${opts.weight ?? 500} ${size * s}px ${opts.font ?? MONO}`
      ctx.textAlign = opts.align ?? 'left'
      ctx.textBaseline = 'middle'
      if (opts.tracking) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${opts.tracking * s}px`
      ctx.fillText(str, 0, 0)
      ctx.restore()
    }
  }
  const outline = (p: Part, pad = 0.08) => {
    for (const [ctx, style] of [
      [c, silk],
      [d, silkData],
    ] as const) {
      ctx.strokeStyle = style
      ctx.lineWidth = Math.max(1, 0.014 * s)
      ctx.strokeRect(X(p.x - p.w / 2 - pad), Z(p.z - p.d / 2 - pad), (p.w + pad * 2) * s, (p.d + pad * 2) * s)
      // 1 numaralı pin işareti
      ctx.fillStyle = style
      ctx.beginPath()
      ctx.arc(X(p.x - p.w / 2 - pad - 0.07), Z(p.z - p.d / 2 - pad - 0.07), 0.035 * s, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  for (const p of layout.parts) {
    if (p.kind === 'hole' || p.kind === 'pcap' || p.kind === 'mosfet' || p.kind === 'dbgled') continue
    if (p.kind !== 'soc' && p.kind !== 'shroud' && p.kind !== 'm2') outline(p)
    if (p.silk) {
      const below = p.kind === 'pwrsw' || p.kind === 'sbled' || p.kind === 'fpanel'
      const sz = p.kind === 'xtal' ? 0.17 : p.kind === 'm2' || p.kind === 'pcie' ? 0.19 : 0.16
      if (p.kind === 'atx') text(p.silk, p.x - p.w / 2 - 0.28, p.z, 0.18, { rot: -Math.PI / 2, align: 'center' })
      else if (p.kind === 'm2') text(p.silk, p.x - p.w / 2, p.z + p.d / 2 + 0.3, sz)
      else if (p.kind === 'pcie') text(p.silk, p.x - p.w / 2, p.z - p.d / 2 - 0.3, sz)
      else text(p.silk, p.x - p.w / 2, below ? p.z + p.d / 2 + 0.26 : p.z - p.d / 2 - 0.24, sz)
    }
  }
  // polimer kondansatörlerin + işaretleri ve VRM bandı
  for (const p of layout.parts.filter((q) => q.kind === 'pcap')) {
    text('+', p.x - 0.5, p.z - 0.32, 0.18)
    for (const [ctx, style] of [
      [c, silk],
      [d, silkData],
    ] as const) {
      ctx.strokeStyle = style
      ctx.lineWidth = Math.max(1, 0.014 * s)
      ctx.beginPath()
      ctx.arc(X(p.x), Z(p.z), (p.w / 2 + 0.06) * s, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  text('VCORE', -7.55, -3.85, 0.15, { tracking: 0.03 })

  // Marka: sol kenar boyunca
  text('MFK-B26', -11.6, -0.6, 0.78, { rot: -Math.PI / 2, align: 'center', weight: 600, font: SANS, tracking: 0.02 })
  text('REV 1.0  ·  2026', -10.75, -0.6, 0.2, { rot: -Math.PI / 2, align: 'center', tracking: 0.05 })
  text('KONYA’DA TASARLANDI', -10.4, -0.6, 0.13, { rot: -Math.PI / 2, align: 'center', tracking: 0.04 })
  text('94V-0   E2610', 11.6, 4.95, 0.14, { align: 'right' })
  text('TÜRKİYE', 11.6, 5.25, 0.14, { align: 'right' })
  // Küçük veri matrisi (gerçek kartlardaki seri kodu)
  for (let i = 0; i < 12; i++)
    for (let j = 0; j < 12; j++) {
      if (r() < 0.48 || i === 0 || j === 11) {
        const x = 9.0 + i * 0.045
        const z = 5.1 + j * 0.045
        for (const [ctx, style] of [
          [c, silk],
          [d, silkData],
        ] as const) {
          ctx.fillStyle = style
          ctx.fillRect(X(x), Z(z), 0.045 * s + 0.5, 0.045 * s + 0.5)
        }
      }
    }
  // Ok: güç düğmesine işaret
  text('←  PWR', 10.95, 7.1, 0.15)

  return {
    color: finish(new THREE.CanvasTexture(col.c), true, aniso),
    data: finish(new THREE.CanvasTexture(dat.c), false, aniso),
  }
}

/** Çıplak kalıbın yüzeyi: şehrin kat planı, uydudan gece görüntüsü gibi. */
export function makeDieTexture(size: number) {
  const W = size
  const H = Math.round(size * 0.75)
  const { c, ctx } = canvas(W, H)
  drawFloorplan(ctx, floorplan(1), W, H, {
    roofs: true,
    glow: 1,
    base: '#05070c',
    streetColor: '#8fd8ff',
    padColor: '#aab6c2',
  })
  return finish(new THREE.CanvasTexture(c), true, 8)
}

/** Paket üstündeki lazer yazısı (siyah epoksi üzerinde mat, hafif açık gri). */
export function chipTopTexture(lines: string[], aspect: number, opts: { dark?: string; ink?: string; logo?: boolean } = {}) {
  const W = 512
  const H = Math.max(64, Math.round(W / aspect))
  const { c, ctx } = canvas(W, H)
  const transparent = opts.dark === 'transparent'
  if (!transparent) {
    ctx.fillStyle = opts.dark ?? '#0e1014'
    ctx.fillRect(0, 0, W, H)
    const r = rng(lines.join('').length * 31)
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.018})`
      ctx.fillRect(r() * W, r() * H, 2, 2)
    }
  }
  ctx.fillStyle = opts.ink ?? 'rgba(150,160,175,0.55)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const fs = Math.min(H / (lines.length + 1.4), W / 7.5)
  lines.forEach((l, i) => {
    ctx.font = `${i === 0 ? 600 : 500} ${fs * (i === 0 ? 1 : 0.72)}px ${MONO}`
    ctx.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * fs * 1.15)
  })
  if (opts.logo !== false) {
    ctx.beginPath()
    ctx.arc(W * 0.1, H * 0.2, Math.min(W, H) * 0.035, 0, Math.PI * 2)
    ctx.fill()
  }
  return finish(new THREE.CanvasTexture(c), true, 4)
}

/** İki haneli 7 segment Q-Code göstergesi. Kod değiştikçe yeniden çizilir. */
export class SevenSeg {
  canvas: HTMLCanvasElement
  texture: THREE.CanvasTexture
  private ctx: CanvasRenderingContext2D
  private current = ''

  constructor() {
    const { c, ctx } = canvas(256, 176)
    this.canvas = c
    this.ctx = ctx
    this.texture = finish(new THREE.CanvasTexture(c), true, 4)
    this.draw('  ')
  }

  draw(code: string) {
    if (code === this.current) return
    this.current = code
    const ctx = this.ctx
    ctx.fillStyle = '#04060a'
    ctx.fillRect(0, 0, 256, 176)
    const seg: Record<string, number[]> = {
      '0': [1, 1, 1, 1, 1, 1, 0], '1': [0, 1, 1, 0, 0, 0, 0], '2': [1, 1, 0, 1, 1, 0, 1], '3': [1, 1, 1, 1, 0, 0, 1],
      '4': [0, 1, 1, 0, 0, 1, 1], '5': [1, 0, 1, 1, 0, 1, 1], '6': [1, 0, 1, 1, 1, 1, 1], '7': [1, 1, 1, 0, 0, 0, 0],
      '8': [1, 1, 1, 1, 1, 1, 1], '9': [1, 1, 1, 1, 0, 1, 1], A: [1, 1, 1, 0, 1, 1, 1], B: [0, 0, 1, 1, 1, 1, 1],
      C: [1, 0, 0, 1, 1, 1, 0], D: [0, 1, 1, 1, 1, 0, 1], E: [1, 0, 0, 1, 1, 1, 1], F: [1, 0, 0, 0, 1, 1, 1], ' ': [0, 0, 0, 0, 0, 0, 0],
    }
    const digit = (ch: string, ox: number) => {
      const on = seg[ch.toUpperCase()] ?? seg[' ']
      const w = 74
      const h = 132
      const t = 13
      const y0 = 22
      const segs: [number, number, number, number][] = [
        [ox + t, y0, w - 2 * t, t],
        [ox + w - t, y0 + t, t, h / 2 - 1.5 * t],
        [ox + w - t, y0 + h / 2 + t / 2, t, h / 2 - 1.5 * t],
        [ox + t, y0 + h - t, w - 2 * t, t],
        [ox, y0 + h / 2 + t / 2, t, h / 2 - 1.5 * t],
        [ox, y0 + t, t, h / 2 - 1.5 * t],
        [ox + t, y0 + h / 2 - t / 2, w - 2 * t, t],
      ]
      segs.forEach(([x, y, sw, sh], i) => {
        ctx.fillStyle = on[i] ? '#d9f4ff' : '#0b1520'
        ctx.fillRect(x + 1.5, y + 1.5, sw - 3, sh - 3)
      })
    }
    digit(code[0] ?? ' ', 42)
    digit(code[1] ?? ' ', 140)
    this.texture.needsUpdate = true
  }
}

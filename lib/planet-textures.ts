/**
 * Procedural texture generation for the solar-system scene.
 *
 * Everything here runs on <canvas> (no external noise/texture packages needed)
 * and produces THREE.CanvasTexture instances: color maps, matching normal maps
 * (so lighting actually reacts to "terrain"), cloud layers, ring textures, a
 * sun texture and a nebula backdrop texture.
 *
 * All noise sampling for planet surfaces is done on a 3D point that walks a
 * circle (for the horizontal/longitude axis), so every equirectangular map
 * wraps seamlessly left-to-right with no visible seam.
 */
import * as THREE from "three"

export type PlanetType = "earth" | "mars" | "jupiter" | "venus" | "neptune"

/** Small deterministic string hash used to seed a planet's procedural look. */
export function seedFromString(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h) % 9973
}

// ---------------------------------------------------------------------------
// Noise primitives (no dependencies)
// ---------------------------------------------------------------------------

function hash3(x: number, y: number, z: number, seed: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 269.5) * 43758.5453123
  return s - Math.floor(s)
}

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Seamless-friendly 3D value noise, returns roughly [-1, 1]. */
function valueNoise3D(x: number, y: number, z: number, seed: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const z0 = Math.floor(z)
  const xf = x - x0
  const yf = y - y0
  const zf = z - z0

  const u = fade(xf)
  const v = fade(yf)
  const w = fade(zf)

  const c000 = hash3(x0, y0, z0, seed)
  const c100 = hash3(x0 + 1, y0, z0, seed)
  const c010 = hash3(x0, y0 + 1, z0, seed)
  const c110 = hash3(x0 + 1, y0 + 1, z0, seed)
  const c001 = hash3(x0, y0, z0 + 1, seed)
  const c101 = hash3(x0 + 1, y0, z0 + 1, seed)
  const c011 = hash3(x0, y0 + 1, z0 + 1, seed)
  const c111 = hash3(x0 + 1, y0 + 1, z0 + 1, seed)

  const x00 = lerp(c000, c100, u)
  const x10 = lerp(c010, c110, u)
  const x01 = lerp(c001, c101, u)
  const x11 = lerp(c011, c111, u)

  const y0i = lerp(x00, x10, v)
  const y1i = lerp(x01, x11, v)

  return lerp(y0i, y1i, w) * 2 - 1
}

function fbm3(x: number, y: number, z: number, seed: number, octaves = 5, lacunarity = 2.05, gain = 0.5) {
  let amp = 0.5
  let freq = 1
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise3D(x * freq, y * freq, z * freq, seed + i * 17.13)
    norm += amp
    amp *= gain
    freq *= lacunarity
  }
  return sum / norm
}

/** Samples fbm on a circle in (x,z) so the u axis (0..1) wraps seamlessly. */
function planetNoise(u: number, v: number, seed: number, opts: { freq?: number; octaves?: number; warp?: number } = {}) {
  const { freq = 2.2, octaves = 5, warp = 0 } = opts
  const angle = u * Math.PI * 2
  let x = Math.cos(angle) * freq
  let z = Math.sin(angle) * freq
  let y = (v - 0.5) * freq * 2

  if (warp > 0) {
    const wx = fbm3(x + 11.2, y + 4.1, z - 7.3, seed + 91, 3) * warp
    const wy = fbm3(x - 3.7, y + 8.8, z + 2.4, seed + 47, 3) * warp
    x += wx
    y += wy
  }

  return fbm3(x, y, z, seed, octaves)
}

// ---------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  return { canvas, ctx: canvas.getContext("2d")! }
}

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace("#", ""), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mixColor(a: string, b: string, t: number): [number, number, number] {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  const c = Math.max(0, Math.min(1, t))
  return [ar + (br - ar) * c, ag + (bg - ag) * c, ab + (bb - ab) * c]
}

function multiColor(stops: { at: number; color: string }[], t: number): [number, number, number] {
  const c = Math.max(0, Math.min(1, t))
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]
    const b = stops[i + 1]
    if (c >= a.at && c <= b.at) {
      const local = (c - a.at) / Math.max(0.0001, b.at - a.at)
      return mixColor(a.color, b.color, local)
    }
  }
  return hexToRgb(stops[stops.length - 1].color)
}

// ---------------------------------------------------------------------------
// Height field (shared basis for color + normal map so lighting matches terrain)
// ---------------------------------------------------------------------------

function buildHeightField(
  width: number,
  height: number,
  seed: number,
  sampler: (u: number, v: number, x: number, y: number) => number,
) {
  const field = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    const v = y / height
    for (let x = 0; x < width; x++) {
      const u = x / width
      field[y * width + x] = sampler(u, v, x, y)
    }
  }
  return field
}

function normalMapFromHeightField(field: Float32Array, width: number, height: number, strength = 2.2) {
  const { canvas, ctx } = makeCanvas(width, height)
  const img = ctx.createImageData(width, height)

  const at = (x: number, y: number) => {
    const xi = ((x % width) + width) % width
    const yi = Math.max(0, Math.min(height - 1, y))
    return field[yi * width + xi]
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const l = at(x - 1, y)
      const r = at(x + 1, y)
      const d = at(x, y - 1)
      const u = at(x, y + 1)

      const nx = (l - r) * strength
      const ny = (d - u) * strength
      const nz = 1.0

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
      const i = (y * width + x) * 4
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255
      img.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }

  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

function toTexture(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

// ---------------------------------------------------------------------------
// Planet color maps
// ---------------------------------------------------------------------------

const PALETTES: Record<PlanetType, { at: number; color: string }[]> = {
  earth: [
    { at: 0, color: "#0a1e4a" },
    { at: 0.38, color: "#0f3d8a" },
    { at: 0.47, color: "#1d6fd4" },
    { at: 0.495, color: "#d9c98a" },
    { at: 0.52, color: "#3f9142" },
    { at: 0.62, color: "#276b33" },
    { at: 0.75, color: "#5c5240" },
    { at: 0.86, color: "#8a8272" },
    { at: 0.94, color: "#e8ecf1" },
    { at: 1, color: "#ffffff" },
  ],
  mars: [
    { at: 0, color: "#5a1f10" },
    { at: 0.35, color: "#7a2c14" },
    { at: 0.55, color: "#a8461f" },
    { at: 0.72, color: "#c96a3a" },
    { at: 0.88, color: "#dd9260" },
    { at: 1, color: "#f0c9a3" },
  ],
  venus: [
    { at: 0, color: "#8a5a12" },
    { at: 0.3, color: "#b5771c" },
    { at: 0.5, color: "#e0a53d" },
    { at: 0.7, color: "#f3c968" },
    { at: 0.88, color: "#fbe3a8" },
    { at: 1, color: "#fff6dd" },
  ],
  jupiter: [
    { at: 0, color: "#5b3a22" },
    { at: 0.22, color: "#a3673b" },
    { at: 0.4, color: "#d8a876" },
    { at: 0.55, color: "#efd9b6" },
    { at: 0.7, color: "#c98a5a" },
    { at: 0.85, color: "#8c5333" },
    { at: 1, color: "#f2e3cf" },
  ],
  neptune: [
    { at: 0, color: "#0b2559" },
    { at: 0.3, color: "#123f8c" },
    { at: 0.55, color: "#2266c9" },
    { at: 0.75, color: "#4a9fe0" },
    { at: 0.9, color: "#a9e0f2" },
    { at: 1, color: "#eaf8ff" },
  ],
}

export interface PlanetMaps {
  map: THREE.CanvasTexture
  normalMap: THREE.CanvasTexture
  cloudsMap?: THREE.CanvasTexture
  nightMap?: THREE.CanvasTexture
}

export function createPlanetMaps(type: PlanetType, seed: number, size = 512): PlanetMaps {
  const width = size
  const height = size / 2
  const palette = PALETTES[type]

  const isBanded = type === "jupiter" || type === "neptune"
  const isCratered = type === "mars"
  const isSwirled = type === "venus"

  const field = buildHeightField(width, height, seed, (u, v) => {
    if (isBanded) {
      const bandCount = type === "jupiter" ? 9 : 6
      const warpedV = v + planetNoise(u, v, seed + 5, { freq: 1.6, octaves: 3, warp: 0 }) * 0.05
      const bands = Math.sin(warpedV * bandCount * Math.PI * 2)
      const turbulence = planetNoise(u, v, seed, { freq: 3.2, octaves: 4, warp: 1.1 }) * 0.35
      let h = bands * 0.5 + 0.5 + turbulence

      // Great spot (storm) blob
      const spotU = 0.32
      const spotV = type === "jupiter" ? 0.62 : 0.4
      const du = Math.min(Math.abs(u - spotU), 1 - Math.abs(u - spotU))
      const dv = v - spotV
      const dist = Math.sqrt(du * du * 6 + dv * dv * 10)
      if (dist < 1) {
        h = lerp(h, type === "jupiter" ? 0.12 : 0.85, (1 - dist) * 0.9)
      }
      return h
    }

    if (isSwirled) {
      const swirl = planetNoise(u, v, seed, { freq: 2.6, octaves: 5, warp: 1.6 })
      return swirl * 0.5 + 0.5
    }

    let h = planetNoise(u, v, seed, { freq: 2.4, octaves: 6, warp: 0.15 }) * 0.5 + 0.5

    if (isCratered) {
      const craterNoise = planetNoise(u, v, seed + 31, { freq: 9, octaves: 2, warp: 0 })
      if (craterNoise > 0.55) {
        h -= (craterNoise - 0.55) * 0.9
      }
      // polar caps
      const polar = Math.max(0, Math.abs(v - 0.5) * 2 - 0.86) * 6
      h = lerp(h, 1, Math.min(1, polar))
    } else {
      // earth-like: polar ice caps
      const polar = Math.max(0, Math.abs(v - 0.5) * 2 - 0.82) * 5
      h = lerp(h, 0.97, Math.min(1, polar))
    }

    return Math.max(0, Math.min(1, h))
  })

  const { canvas, ctx } = makeCanvas(width, height)
  const img = ctx.createImageData(width, height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const h = field[idx]
      const [r, g, b] = multiColor(palette, h)
      // subtle per-pixel micro variation so it doesn't look flat/banded
      const grain = (hash3(x, y, seed + 99, 3.1) - 0.5) * 10
      const i = idx * 4
      img.data[i] = Math.max(0, Math.min(255, r + grain))
      img.data[i + 1] = Math.max(0, Math.min(255, g + grain))
      img.data[i + 2] = Math.max(0, Math.min(255, b + grain))
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  const map = toTexture(canvas)
  const normalMap = normalMapFromHeightField(field, width, height, isBanded || isSwirled ? 0.8 : 2.4)

  let cloudsMap: THREE.CanvasTexture | undefined
  if (type === "earth") {
    const { canvas: cc, ctx: cctx } = makeCanvas(width, height)
    const cimg = cctx.createImageData(width, height)
    for (let y = 0; y < height; y++) {
      const v = y / height
      for (let x = 0; x < width; x++) {
        const u = x / width
        const n = planetNoise(u, v, seed + 200, { freq: 3.4, octaves: 5, warp: 0.6 }) * 0.5 + 0.5
        const alpha = Math.max(0, n - 0.52) * 2.2
        const i = (y * width + x) * 4
        cimg.data[i] = 255
        cimg.data[i + 1] = 255
        cimg.data[i + 2] = 255
        cimg.data[i + 3] = Math.min(255, alpha * 255)
      }
    }
    cctx.putImageData(cimg, 0, 0)
    cloudsMap = toTexture(cc)
  }

  let nightMap: THREE.CanvasTexture | undefined
  if (type === "earth") {
    const { canvas: nc, ctx: nctx } = makeCanvas(width, height)
    nctx.fillStyle = "#000000"
    nctx.fillRect(0, 0, width, height)
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * width
      const yv = height * 0.15 + Math.random() * height * 0.7
      const r = Math.random() * 1.4 + 0.3
      nctx.globalAlpha = 0.5 + Math.random() * 0.5
      nctx.fillStyle = "#ffd98a"
      nctx.beginPath()
      nctx.arc(x, yv, r, 0, Math.PI * 2)
      nctx.fill()
    }
    nightMap = toTexture(nc)
  }

  return { map, normalMap, cloudsMap, nightMap }
}

// ---------------------------------------------------------------------------
// Moon
// ---------------------------------------------------------------------------

export function createMoonMap(seed = 7): PlanetMaps {
  const width = 256
  const height = 128
  const field = buildHeightField(width, height, seed, (u, v) => {
    let h = planetNoise(u, v, seed, { freq: 3, octaves: 5 }) * 0.5 + 0.5
    const craterNoise = planetNoise(u, v, seed + 12, { freq: 11, octaves: 2 })
    if (craterNoise > 0.5) h -= (craterNoise - 0.5) * 1.1
    return Math.max(0, Math.min(1, h))
  })
  const { canvas, ctx } = makeCanvas(width, height)
  const img = ctx.createImageData(width, height)
  const palette = [
    { at: 0, color: "#3a3a42" },
    { at: 0.5, color: "#8a8a92" },
    { at: 0.85, color: "#b8b8c0" },
    { at: 1, color: "#e4e4ea" },
  ]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const [r, g, b] = multiColor(palette, field[idx])
      const i = idx * 4
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return { map: toTexture(canvas), normalMap: normalMapFromHeightField(field, width, height, 2.8) }
}

// ---------------------------------------------------------------------------
// Sun
// ---------------------------------------------------------------------------

export function createSunTexture(seed = 3) {
  const width = 512
  const height = 256
  const { canvas, ctx } = makeCanvas(width, height)
  const img = ctx.createImageData(width, height)

  const palette = [
    { at: 0, color: "#ff8a00" },
    { at: 0.35, color: "#ffb300" },
    { at: 0.6, color: "#ffd93d" },
    { at: 0.82, color: "#fff2b0" },
    { at: 1, color: "#ffffff" },
  ]

  for (let y = 0; y < height; y++) {
    const v = y / height
    for (let x = 0; x < width; x++) {
      const u = x / width
      const granulation = planetNoise(u, v, seed, { freq: 6, octaves: 5, warp: 0.8 }) * 0.5 + 0.5
      const flare = planetNoise(u, v, seed + 40, { freq: 2, octaves: 3, warp: 0.2 }) * 0.5 + 0.5
      const h = Math.max(0, Math.min(1, granulation * 0.7 + flare * 0.3))
      const [r, g, b] = multiColor(palette, h)
      const i = (y * width + x) * 4
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return toTexture(canvas)
}

// ---------------------------------------------------------------------------
// Rings
// ---------------------------------------------------------------------------

export function createRingTexture(baseColor: string, seed = 12) {
  const width = 512
  const height = 32
  const { canvas, ctx } = makeCanvas(width, height)
  const img = ctx.createImageData(width, height)

  for (let x = 0; x < width; x++) {
    const t = x / width
    const bandNoise = valueNoise3D(t * 40, seed, 0, seed) * 0.5 + 0.5
    const gapNoise = valueNoise3D(t * 90, seed + 5, 1, seed) * 0.5 + 0.5
    let alpha = 0.15 + bandNoise * 0.55
    if (gapNoise > 0.82) alpha *= 0.25
    // fade at inner/outer edge
    const edgeFade = Math.sin(t * Math.PI)
    alpha *= 0.4 + edgeFade * 0.6

    const [r, g, b] = mixColor(baseColor, "#ffffff", bandNoise * 0.3)
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = Math.min(255, alpha * 255)
    }
  }
  ctx.putImageData(img, 0, 0)
  return toTexture(canvas)
}

// ---------------------------------------------------------------------------
// Nebula backdrop
// ---------------------------------------------------------------------------

export function createNebulaTexture(seed: number, colors: string[]) {
  const width = 1024
  const height = 512
  const { canvas, ctx } = makeCanvas(width, height)
  const img = ctx.createImageData(width, height)

  for (let y = 0; y < height; y++) {
    const v = y / height
    for (let x = 0; x < width; x++) {
      const u = x / width
      const shape = planetNoise(u, v, seed, { freq: 1.4, octaves: 5, warp: 2.4 }) * 0.5 + 0.5
      const detail = planetNoise(u, v, seed + 71, { freq: 4, octaves: 4, warp: 1 }) * 0.5 + 0.5
      const density = Math.max(0, shape - 0.42) * 1.8 * (0.6 + detail * 0.4)

      const colorT = planetNoise(u, v, seed + 150, { freq: 2, octaves: 3 }) * 0.5 + 0.5
      const colorIdx = Math.min(colors.length - 2, Math.floor(colorT * (colors.length - 1)))
      const localT = colorT * (colors.length - 1) - colorIdx
      const [r, g, b] = mixColor(colors[colorIdx], colors[colorIdx + 1], localT)

      const i = (y * width + x) * 4
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = Math.min(255, density * 255)
    }
  }
  ctx.putImageData(img, 0, 0)
  return toTexture(canvas)
}

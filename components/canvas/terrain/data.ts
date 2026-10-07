import meta from '@/lib/terrain-meta.json'

/**
 * Arazi verisi: public/data/terrain.png (R yükselti, G Türkiye, B kara) ve
 * public/data/contours.bin (eş-yükselti, kıyı ve sınır çizgileri). Bkz. scripts/prepare-terrain.py
 */

export const MAP = {
  /** derece başına sahne birimi */
  scale: 5,
  lonC: (meta.lon0 + meta.lon1) / 2,
  latC: (meta.lat0 + meta.lat1) / 2,
  heightScale: 3.1,
}
export const COS_LAT = Math.cos((MAP.latC * Math.PI) / 180)
export const MAP_W = (meta.lon1 - meta.lon0) * COS_LAT * MAP.scale
export const MAP_D = (meta.lat1 - meta.lat0) * MAP.scale

export function lonLatToXZ(lon: number, lat: number): [number, number] {
  return [(lon - MAP.lonC) * COS_LAT * MAP.scale, -(lat - MAP.latC) * MAP.scale]
}

/** Doku koordinatı (u: batı→doğu, v: kuzey→güney) → sahne x, z */
export function uvToXZ(u: number, v: number): [number, number] {
  return [(u - 0.5) * MAP_W, (v - 0.5) * MAP_D]
}

export interface TerrainData {
  width: number
  height: number
  /** RGBA bayt dizisi */
  pixels: Uint8ClampedArray
  contours: { code: number; pts: Float32Array }[]
}

let promise: Promise<TerrainData> | null = null

export function loadTerrain(): Promise<TerrainData> {
  if (promise) return promise
  promise = (async () => {
    const img = new Image()
    img.decoding = 'async'
    img.src = '/data/terrain.png'
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0)
    const { data } = ctx.getImageData(0, 0, c.width, c.height)

    const buf = await (await fetch('/data/contours.bin')).arrayBuffer()
    const dv = new DataView(buf)
    const n = dv.getUint32(0, true)
    let off = 4
    const pad = meta.uvPad
    const contours: TerrainData['contours'] = []
    for (let i = 0; i < n; i++) {
      const code = dv.getUint16(off, true)
      const count = dv.getUint32(off + 4, true)
      off += 8
      const pts = new Float32Array(count * 2)
      for (let j = 0; j < count; j++) {
        pts[j * 2] = (dv.getUint16(off, true) / 65535) * (1 + 2 * pad) - pad
        pts[j * 2 + 1] = (dv.getUint16(off + 2, true) / 65535) * (1 + 2 * pad) - pad
        off += 4
      }
      contours.push({ code, pts })
    }
    return { width: c.width, height: c.height, pixels: data, contours }
  })()
  return promise
}

/** İkili-doğrusal örnekleme: kanal 0 yükselti, 1 Türkiye, 2 kara. 0..1 döner. */
export function sample(t: TerrainData, u: number, v: number, ch: 0 | 1 | 2) {
  const x = Math.min(Math.max(u, 0), 1) * (t.width - 1)
  const y = Math.min(Math.max(v, 0), 1) * (t.height - 1)
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(x0 + 1, t.width - 1)
  const y1 = Math.min(y0 + 1, t.height - 1)
  const fx = x - x0
  const fy = y - y0
  const p = (xx: number, yy: number) => t.pixels[(yy * t.width + xx) * 4 + ch] / 255
  return (p(x0, y0) * (1 - fx) + p(x1, y0) * fx) * (1 - fy) + (p(x0, y1) * (1 - fx) + p(x1, y1) * fx) * fy
}

export function heightAt(t: TerrainData, u: number, v: number) {
  return sample(t, u, v, 0) * MAP.heightScale
}

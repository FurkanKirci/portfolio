import type { Tier } from './store'

export interface TierConfig {
  dprMax: number
  /** parçacık dokusunun kenarı: N*N parçacık */
  particles: number
  boardTex: number
  cityDensity: number
  ao: boolean
  dof: boolean
  bloom: boolean
  motes: number
  shadows: boolean
  /** kartta ucuz ışık ve malzemeler (alan ışığı ve vernik katmanı yok) */
  lite: boolean
  /** kenar yumuşatma geçişi */
  smaa: boolean
  /** çizim tamponunun en fazla piksel sayısı: büyük ekranlarda zayıf ekran kartını boğmasın */
  pixelBudget: number
}

export const tiers: Record<Tier, TierConfig> = {
  low: { dprMax: 1, particles: 128, boardTex: 2048, cityDensity: 0.55, ao: false, dof: false, bloom: true, motes: 400, shadows: false, lite: true, smaa: false, pixelBudget: 1.05e6 },
  medium: { dprMax: 1.25, particles: 256, boardTex: 2048, cityDensity: 0.8, ao: false, dof: false, bloom: true, motes: 1200, shadows: false, lite: true, smaa: true, pixelBudget: 1.9e6 },
  high: { dprMax: 1.75, particles: 512, boardTex: 4096, cityDensity: 1, ao: true, dof: true, bloom: true, motes: 2400, shadows: true, lite: false, smaa: true, pixelBudget: 3.7e6 },
  ultra: { dprMax: 2, particles: 1024, boardTex: 4096, cityDensity: 1, ao: true, dof: true, bloom: true, motes: 4000, shadows: true, lite: false, smaa: true, pixelBudget: 8.3e6 },
}

/** Kademenin izin verdiği en yüksek piksel oranı (ekran boyutuna ve piksel bütçesine göre). */
export function baseDpr(cfg: TierConfig, cssW: number, cssH: number) {
  const device = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const budget = Math.sqrt(cfg.pixelBudget / Math.max(1, cssW * cssH))
  return Math.max(0.5, Math.min(device, cfg.dprMax, budget))
}

export const tierLabel: Record<Tier, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  ultra: 'Ultra',
}

/** GPU adı (WEBGL_debug_renderer_info) okunabiliyorsa döner. */
export function gpuName(gl: WebGLRenderingContext | WebGL2RenderingContext | null): string {
  if (!gl) return 'bilinmiyor'
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    return String(name || 'bilinmiyor')
  } catch {
    return 'bilinmiyor'
  }
}

/** Kaba ama güvenli bir ilk tahmin. Çalışırken FPS düşerse kademe otomatik iner. */
export function detectTier(gl: WebGLRenderingContext | WebGL2RenderingContext | null): Tier {
  if (typeof navigator === 'undefined') return 'medium'
  const name = gpuName(gl).toLowerCase()
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const mobile = coarse || /android|iphone|ipad|mobile/i.test(navigator.userAgent)
  const cores = navigator.hardwareConcurrency || 4
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8

  if (/swiftshader|llvmpipe|software|basic render/.test(name)) return 'low'
  if (mobile) {
    if (/apple gpu|apple a1[7-9]|apple m|adreno \(tm\) 7[3-9]|immortalis|mali-g7[1-9]/.test(name) && mem >= 6) return 'medium'
    return 'low'
  }
  if (/nvidia|geforce|rtx|quadro|radeon rx|radeon pro|arc a|arc b|apple m[2-9]|apple m1 (pro|max|ultra)/.test(name)) {
    return cores >= 8 ? 'high' : 'medium'
  }
  if (/apple m1|apple gpu/.test(name)) return 'high'
  if (/intel|uhd|iris|radeon\(tm\) graphics|vega/.test(name)) return 'medium'
  return cores >= 8 && mem >= 8 ? 'high' : 'medium'
}

export function stepDown(t: Tier): Tier {
  return t === 'ultra' ? 'high' : t === 'high' ? 'medium' : 'low'
}

/** Yazılımla çizim (ekran kartı kullanılmıyor): SwiftShader, llvmpipe, Microsoft Basic Render... */
export function isSoftwareRenderer(context: WebGLRenderingContext | WebGL2RenderingContext | null) {
  if (!context) return false
  const name = gpuName(context).toLowerCase()
  if (/swiftshader|llvmpipe|softpipe|software|basic render/.test(name)) return true
  try {
    const probe = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true })
    if (!probe) return true
    probe.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    /* yoksay */
  }
  return false
}

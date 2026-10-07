import { create } from 'zustand'
import type { ChapterId } from './content'

export type Power = 'off' | 'booting' | 'on'
export type Tier = 'low' | 'medium' | 'high' | 'ultra'
export type QualitySetting = 'auto' | Tier

export interface Settings {
  quality: QualitySetting
  sound: boolean
  volume: number
  motion: 'full' | 'reduced'
  fastBoot: boolean
  dof: boolean
  bloom: boolean
  fps: boolean
}

export const defaultSettings: Settings = {
  quality: 'auto',
  sound: true,
  volume: 0.75,
  motion: 'full',
  fastBoot: false,
  dof: true,
  bloom: true,
  fps: false,
}

const SETTINGS_KEY = 'mfk-bios-v1'

export function loadSettings(): Settings {
  const base = { ...defaultSettings }
  try {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      base.motion = 'reduced'
    }
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SETTINGS_KEY) : null
    if (raw) return { ...base, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    /* gizli sekme ya da engellenmiş depolama: varsayılanlarla devam */
  }
  return base
}

export function saveSettings(s: Settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* sorun değil */
  }
}

export interface Toast {
  id: number
  text: string
  tone?: 'ok' | 'warn' | 'err'
}

interface AppState {
  power: Power
  bootAt: number
  /** sahne derlendi, güç tuşu kullanılabilir */
  ready: boolean
  /** WebGL yoksa false: içerik yine tam olarak okunur */
  webgl: boolean
  chapter: ChapterId
  autoTier: Tier
  settings: Settings
  bios: boolean
  menu: boolean
  proc: number | null
  hoverProc: number | null
  core: number | null
  channel: string | null
  overclock: boolean
  panic: boolean
  /** tam ekran karartma (bölümler arası uzun atlamalar, yeniden başlatma) */
  blackout: boolean
  toasts: Toast[]
  uptimeFrom: number

  set: (p: Partial<AppState>) => void
  setSettings: (p: Partial<Settings>) => void
  toast: (text: string, tone?: Toast['tone']) => void
  dropToast: (id: number) => void
}

let toastSeq = 0

export const useApp = create<AppState>((set, get) => ({
  power: 'off',
  bootAt: 0,
  ready: false,
  webgl: true,
  chapter: 'hero',
  autoTier: 'high',
  settings: defaultSettings,
  bios: false,
  menu: false,
  proc: null,
  hoverProc: null,
  core: null,
  channel: null,
  overclock: false,
  panic: false,
  blackout: false,
  toasts: [],
  uptimeFrom: 0,

  set: (p) => set(p),
  setSettings: (p) => {
    const settings = { ...get().settings, ...p }
    saveSettings(settings)
    set({ settings })
  },
  toast: (text, tone = 'ok') => {
    const id = ++toastSeq
    set({ toasts: [...get().toasts.slice(-3), { id, text, tone }] })
    window.setTimeout(() => get().dropToast(id), 4200)
  },
  dropToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export function resolvedTier(): Tier {
  const { settings, autoTier } = useApp.getState()
  return settings.quality === 'auto' ? autoTier : settings.quality
}

/**
 * Her karede değişen değerler. React render'ı tetiklemesin diye store dışında, düz bir nesnede tutulur.
 * Döngü (lib/loop.ts) yazar; 3D sahne ve katmanlar okur.
 */
export const frame = {
  time: 0,
  dt: 0.016,
  scrollY: 0,
  viewW: 1,
  viewH: 1,
  /** 0..7 arası "film zamanı": bölüm indeksi + bölüm içi ilerleme */
  film: 0,
  chapterIdx: 0,
  local: 0,
  locals: {} as Record<ChapterId, number>,
  velocity: 0,
  /** kaydırma hızından türeyen 0..1 "işlemci yükü" */
  load: 0,
  /** açılış sinematiğindeki saniye; açılış yoksa -1 */
  bootT: -1,
  pointer: { x: 0, y: 0, nx: 0, ny: 0, inside: false },
  /** sürükleyerek bakış (radyan) */
  look: { yaw: 0, pitch: 0, dragging: false },
  fps: 60,
  /** büyük atlamalarda kameranın sönümlemeden yerine oturması için */
  snap: 0,
  /** yalnızca geliştirme: açılış saniyesini sabitler (≥ 0 ise) */
  debugBootT: -1,
}

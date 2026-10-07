'use client'

import Lenis from 'lenis'
import { chapters, type ChapterId } from './content'
import { clamp, damp } from './math'
import { frame, useApp } from './store'

/**
 * Sitenin tek requestAnimationFrame döngüsü.
 * Sıra: kaydırma (Lenis) → kare değerleri → abone katmanlar → 3D sahne (R3F advance).
 * Böylece DOM ve WebGL aynı karede, aynı değerlerle güncellenir.
 */

type FrameFn = (dt: number, time: number) => void

const subscribers = new Set<FrameFn>()
let renderFn: ((timestamp: number) => void) | null = null
let lenis: Lenis | null = null
let rafId = 0
let lastNow = 0
let bounds: { id: ChapterId; start: number; end: number }[] = []
let fpsAcc = 0
let fpsFrames = 0

export function onFrame(fn: FrameFn) {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}

export function setRenderer(fn: ((timestamp: number) => void) | null) {
  renderFn = fn
}

export function getLenis() {
  return lenis
}

export function measure() {
  frame.viewW = window.innerWidth
  frame.viewH = window.innerHeight
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - frame.viewH)
  const tops = chapters.map((c) => {
    const el = document.getElementById(`ch-${c.id}`)
    return el ? el.getBoundingClientRect().top + window.scrollY : 0
  })
  bounds = chapters.map((c, i) => ({
    id: c.id,
    start: tops[i],
    end: i < chapters.length - 1 ? tops[i + 1] : maxScroll,
  }))
}

/** Bir bölümün başlangıcına (ve isteğe bağlı bölüm içi orana) karşılık gelen kaydırma konumu. */
export function scrollTarget(id: ChapterId, local = 0) {
  const b = bounds.find((x) => x.id === id)
  if (!b) return 0
  return b.start + (b.end - b.start) * local
}

export function scrollToChapter(id: ChapterId, local = 0.12, opts: { immediate?: boolean } = {}) {
  const target = scrollTarget(id, local)
  if (!lenis) {
    window.scrollTo({ top: target, behavior: opts.immediate ? 'auto' : 'smooth' })
    return
  }
  const distance = Math.abs(target - frame.scrollY) / Math.max(1, frame.viewH)
  if (opts.immediate || distance > 4.5) {
    // Uzak atlamalarda dünyaları tek tek uçarak geçmek yerine kısa bir karartma ile ışınlan.
    const app = useApp.getState()
    app.set({ blackout: true })
    window.setTimeout(() => {
      lenis?.scrollTo(target, { immediate: true, force: true })
      frame.snap = 2
      window.setTimeout(() => useApp.getState().set({ blackout: false }), 120)
    }, 260)
    return
  }
  lenis.scrollTo(target, { duration: Math.min(3.2, 0.9 + distance * 0.55), force: true })
}

export function lockScroll(locked: boolean) {
  if (!lenis) return
  if (locked) lenis.stop()
  else lenis.start()
  document.documentElement.classList.toggle('scroll-locked', locked)
}

function tick(now: number) {
  rafId = requestAnimationFrame(tick)
  const time = now / 1000
  const dt = lastNow ? Math.min(0.1, Math.max(0.001, time - lastNow)) : 1 / 60
  lastNow = time
  frame.time = time
  frame.dt = dt

  // FPS ölçümü (BIOS'taki gösterge ve otomatik kalite için)
  fpsAcc += dt
  fpsFrames++
  if (fpsAcc > 0.5) {
    frame.fps = fpsFrames / fpsAcc
    fpsAcc = 0
    fpsFrames = 0
  }

  lenis?.raf(now)
  const y = lenis ? lenis.animatedScroll : window.scrollY
  const v = (y - frame.scrollY) / dt
  frame.velocity = damp(frame.velocity, Number.isFinite(v) ? v : 0, 5, dt)
  frame.load = damp(frame.load, clamp(Math.abs(frame.velocity) / (frame.viewH * 3.2)), 2.5, dt)
  frame.scrollY = y

  let idx = 0
  for (let i = 0; i < bounds.length; i++) {
    const b = bounds[i]
    const local = clamp((y - b.start) / Math.max(1, b.end - b.start))
    frame.locals[b.id] = local
    if (y >= b.start - 1) idx = i
  }
  if (bounds.length) {
    frame.chapterIdx = idx
    frame.local = frame.locals[bounds[idx].id] ?? 0
    frame.film = idx + frame.local
    const id = bounds[idx].id
    if (useApp.getState().chapter !== id) useApp.getState().set({ chapter: id })
  }

  for (const fn of subscribers) fn(dt, time)
  renderFn?.(now)
  if (frame.snap > 0) frame.snap--
}

export function startLoop() {
  if (rafId) return
  // Film her zaman baştan başlar: yenilemede tarayıcının eski kaydırma konumunu geri yüklemesine izin verme
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  window.scrollTo(0, 0)
  lenis = new Lenis({
    lerp: 0.085,
    smoothWheel: true,
    wheelMultiplier: 0.8,
    touchMultiplier: 1.15,
    autoRaf: false,
  })
  lenis.stop()
  document.documentElement.classList.add('scroll-locked')
  measure()
  const ro = new ResizeObserver(() => measure())
  ro.observe(document.body)
  window.addEventListener('resize', measure)
  rafId = requestAnimationFrame(tick)
}

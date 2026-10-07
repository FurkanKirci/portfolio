'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { chapters, type ChapterId } from '@/lib/content'
import { onFrame } from '@/lib/loop'
import { smoothstep } from '@/lib/math'
import { frame, useApp } from '@/lib/store'

/**
 * Bir bölümün sabit katmanı. İçindeki `data-in` / `data-out` öznitelikli öğeler,
 * bölüm içi ilerlemeye göre `--o` (0..1) değişkeniyle belirip kaybolur.
 *
 *   <p className="fade-in" data-in="0.1" data-out="0.8">…</p>
 */

export interface LayerProps {
  id: ChapterId
  children: ReactNode
  className?: string
  /** her karede bölüm içi ilerlemeyle çağrılır */
  onLocal?: (local: number, active: boolean) => void
  /** bölüm dışında da etkin kalsın mı (örn. açılış sırasında kahraman katmanı) */
  extraActive?: () => number | null
}

interface Fader {
  el: HTMLElement
  a: number
  b: number
  len: number
}

export function Layer({ id, children, className = '', onLocal, extraActive }: LayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const cb = useRef(onLocal)
  const extra = useRef(extraActive)
  useEffect(() => {
    cb.current = onLocal
    extra.current = extraActive
  })

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const idx = chapters.findIndex((c) => c.id === id)
    let faders: Fader[] = []
    const collect = () => {
      faders = Array.from(root.querySelectorAll<HTMLElement>('[data-in]')).map((el) => ({
        el,
        a: parseFloat(el.dataset.in ?? '0'),
        b: parseFloat(el.dataset.out ?? '2'),
        len: parseFloat(el.dataset.len ?? '0.05'),
      }))
    }
    collect()
    const mo = new MutationObserver(collect)
    mo.observe(root, { childList: true, subtree: true })
    let wasOn = false
    const off = onFrame(() => {
      const app = useApp.getState()
      let local = frame.locals[id] ?? 0
      let on = app.power === 'on' && frame.chapterIdx === idx
      const forced = extra.current?.()
      if (forced !== null && forced !== undefined) {
        on = true
        local = forced
      }
      if (on !== wasOn) {
        root.dataset.on = on ? '1' : '0'
        wasOn = on
      }
      cb.current?.(local, on)
      if (!on) return
      for (const f of faders) {
        const o = smoothstep(f.a, f.a + f.len, local) * (1 - smoothstep(f.b - f.len, f.b, local))
        f.el.style.setProperty('--o', o.toFixed(3))
        f.el.style.visibility = o < 0.002 ? 'hidden' : ''
      }
    })
    return () => {
      off()
      mo.disconnect()
    }
  }, [id])

  return (
    <div ref={ref} className={`layer ${className}`} data-on="0" data-chapter={id}>
      {children}
    </div>
  )
}

/** Bölüm başlığı: kod + komut + başlık + tek satırlık serif cümle. */
export function ChapterTag({ id, inAt = 0.04, outAt = 0.97 }: { id: ChapterId; inAt?: number; outAt?: number }) {
  const c = chapters.find((x) => x.id === id)!
  return (
    <header className="fade-in" data-in={inAt} data-out={outAt}>
      <div className="flex items-center gap-3 t-label">
        <span className="text-ice normal-case">{c.code}</span>
        <span className="h-px w-8 bg-[var(--hair-strong)]" />
        <span>{c.cmd}</span>
      </div>
      <h2 className="chapter-title mt-3 t-display text-ink">{c.title}</h2>
      <p className="mt-2 t-serif text-[clamp(1.1rem,1.6vw,1.5rem)] text-mute">{c.line}</p>
    </header>
  )
}

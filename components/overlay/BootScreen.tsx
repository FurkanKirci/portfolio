'use client'

import { useEffect, useRef } from 'react'
import { bootLines } from '@/lib/content'
import { onFrame } from '@/lib/loop'
import { frame, useApp } from '@/lib/store'
import { sys } from '@/components/canvas/system'
import { BOOT } from '@/lib/boot'
import { SevenSegment } from './SevenSegment'

const LINE_AT = [0.55, 1.65, 2.0, 2.75, 3.75]

/** Açılış sinematiği sırasında ekrandaki POST satırları, Q-Code ve kısayollar. */
export function BootScreen() {
  const power = useApp((s) => s.power)
  const root = useRef<HTMLDivElement>(null)
  const lines = useRef<(HTMLLIElement | null)[]>([])
  const q = useRef<HTMLDivElement>(null)

  useEffect(
    () =>
      onFrame(() => {
        const el = root.current
        if (!el) return
        const t = frame.bootT
        const booting = useApp.getState().power === 'booting'
        const o = booting ? Math.min(1, t * 2) * (1 - Math.max(0, Math.min(1, (t - (BOOT.end - 0.6)) / 0.6))) : 0
        el.style.opacity = o.toFixed(3)
        el.style.visibility = o > 0.001 ? 'visible' : 'hidden'
        lines.current.forEach((li, i) => {
          if (!li) return
          const shown = t >= LINE_AT[i]
          li.dataset.on = shown ? '1' : '0'
          const v = li.querySelector<HTMLElement>('[data-v]')
          if (v) {
            const full = v.dataset.full ?? ''
            const n = shown ? Math.min(full.length, Math.floor((t - LINE_AT[i]) * 60)) : 0
            if (v.textContent?.length !== n) v.textContent = full.slice(0, n)
          }
        })
        if (q.current) q.current.dataset.code = sys.qcode
      }),
    [],
  )

  return (
    <div ref={root} className="fixed inset-0 z-20 pointer-events-none" style={{ opacity: 0, visibility: 'hidden' }} aria-hidden={power !== 'booting'}>
      <ul className="absolute left-[var(--gutter)] top-[calc(var(--gutter)*0.6+40px)] space-y-1.5 t-mono text-[12px]">
        {bootLines.map((l, i) => (
          <li
            key={l.k}
            ref={(el) => {
              lines.current[i] = el
            }}
            className="flex gap-3 opacity-0 transition-opacity duration-200 data-[on='1']:opacity-100"
            data-on="0"
          >
            <span className="w-12 text-mute">{l.k}</span>
            <span className="text-ink" data-v data-full={l.v} />
          </li>
        ))}
      </ul>

      <div className="absolute bottom-[calc(var(--gutter)*0.6)] left-[var(--gutter)] flex flex-wrap items-center gap-x-5 gap-y-2 t-mono text-[11px] text-mute">
        <span className="flex items-center gap-2">
          <span className="kbd">DEL</span> Kurulum
        </span>
        <span className="flex items-center gap-2">
          <span className="kbd">F8</span> Önyükleme menüsü
        </span>
      </div>

      <div className="absolute bottom-[calc(var(--gutter)*0.6)] right-[var(--gutter)] flex items-end gap-5">
        <div ref={q} className="flex flex-col items-end gap-2">
          <span className="t-label">Q-Code</span>
          <SevenSegment source={() => sys.qcode} />
        </div>
        <span className="flex items-center gap-2 t-mono text-[11px] text-mute">
          <span className="kbd">ESC</span> atla
        </span>
      </div>
    </div>
  )
}

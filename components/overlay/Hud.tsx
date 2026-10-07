'use client'

import { useEffect, useRef } from 'react'
import { jumpTo, toggleSound } from '@/lib/actions'
import { sound } from '@/lib/audio'
import { chapters, profile } from '@/lib/content'
import { onFrame } from '@/lib/loop'
import { formatUptime } from '@/lib/math'
import { frame, useApp } from '@/lib/store'

/** Üst ve alt şeritler: konum, ses, kurulum, menü, çalışma süresi ve bölüm göstergesi. */
export function Hud() {
  const power = useApp((s) => s.power)
  const chapter = useApp((s) => s.chapter)
  const soundOn = useApp((s) => s.settings.sound)
  const overclock = useApp((s) => s.overclock)
  // vaka paneli açıkken üst şerit camın arkasından görünmesin
  const covered = useApp((s) => s.proc !== null)
  const status = useRef<HTMLSpanElement>(null)
  const bars = useRef<(HTMLSpanElement | null)[]>([])

  const current = chapters.find((c) => c.id === chapter) ?? chapters[0]
  const on = power === 'on'
  const visible = power !== 'off'

  useEffect(
    () => {
      let last = 0
      return onFrame((_, time) => {
        const app = useApp.getState()
        if (status.current && app.power !== 'off' && time - last > 0.25) {
          last = time
          const up = formatUptime(Date.now() - (app.uptimeFrom || Date.now()))
          const mhz = app.overclock ? '31.337' : '25.000'
          const txt = `çalışma ${up} · yük ${frame.load.toFixed(2)} · ${mhz} MHz`
          if (status.current.textContent !== txt) status.current.textContent = txt
        }
        chapters.slice(1).forEach((c, i) => {
          const el = bars.current[i]
          if (!el) return
          const v = `scaleX(${(frame.locals[c.id] ?? 0).toFixed(3)})`
          if (el.style.transform !== v) el.style.transform = v
        })
      })
    },
    [],
  )

  return (
    <>
      {/* üst şerit */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between px-[var(--gutter)] pt-[calc(var(--gutter)*0.55)] transition-opacity duration-500"
        style={{ opacity: covered ? 0 : 1 }}
      >
        <div className="flex items-center gap-4 transition-opacity duration-700" style={{ opacity: visible ? 1 : 0 }}>
          <button
            type="button"
            className="pointer-events-auto font-sans text-[15px] font-semibold tracking-[0.06em] text-ink"
            onClick={() => jumpTo('hero', 0)}
            aria-label="Başa dön"
            tabIndex={visible ? 0 : -1}
          >
            {profile.initials}
          </button>
          <span className="hidden h-px w-6 bg-[var(--hair-strong)] sm:block" />
          <span className="hidden t-label sm:block">
            <span className="text-ice normal-case">{on ? current.code : '0x00'}</span>
            <span className="mx-2 text-dim">·</span>
            {on ? current.cmd : 'açılış'}
          </span>
        </div>
        <nav className="pointer-events-auto flex items-center gap-1" aria-label="Sistem">
          <button
            type="button"
            className="btn-ghost flex items-center gap-2"
            onClick={() => toggleSound()}
            onMouseEnter={() => sound.hover()}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Sesi kapat (M)' : 'Sesi aç (M)'}
          >
            <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
              {[0.5, 1, 0.7].map((h, i) => (
                <span
                  key={i}
                  className="w-[2px] bg-current"
                  style={{
                    height: soundOn ? `${h * 100}%` : '18%',
                    animation: soundOn ? `eq ${0.9 + i * 0.23}s ease-in-out ${i * 0.1}s infinite alternate` : 'none',
                  }}
                />
              ))}
            </span>
            <span>{soundOn ? 'Ses' : 'Sessiz'}</span>
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              sound.click()
              useApp.getState().set({ bios: true, menu: false })
            }}
            onMouseEnter={() => sound.hover()}
            aria-label="Kurulum (DEL)"
          >
            Kurulum
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              sound.click()
              useApp.getState().set({ menu: true, bios: false })
            }}
            onMouseEnter={() => sound.hover()}
            aria-label="Önyükleme menüsü (F8)"
          >
            Menü
          </button>
        </nav>
      </div>

      {/* alt şerit */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-end justify-between gap-6 px-[var(--gutter)] pb-[calc(var(--gutter)*0.55)] transition-opacity duration-700"
        style={{ opacity: on ? 1 : 0 }}
      >
        <span ref={status} className={`hidden t-mono text-[11px] sm:block ${overclock ? 'text-heat' : 'text-dim'}`} />
        <ol className="pointer-events-auto ml-auto flex items-center gap-1.5" aria-label="Bölümler">
          {chapters.slice(1).map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                className="group flex flex-col items-start gap-1.5 px-1 py-2"
                onClick={() => {
                  sound.click()
                  jumpTo(c.id)
                }}
                onMouseEnter={() => sound.hover()}
                tabIndex={on ? 0 : -1}
                aria-label={`${c.code} ${c.title}`}
                aria-current={chapter === c.id ? 'step' : undefined}
              >
                <span className="relative block h-[2px] w-7 overflow-hidden bg-[rgba(127,214,255,0.16)] sm:w-10">
                  <span
                    ref={(el) => {
                      bars.current[i] = el
                    }}
                    className="absolute inset-0 origin-left bg-ice"
                    style={{ transform: 'scaleX(0)' }}
                  />
                </span>
                <span
                  className={`hidden t-mono text-[10px] tracking-[0.12em] transition-colors sm:block ${
                    chapter === c.id ? 'text-ink' : 'text-dim group-hover:text-mute'
                  }`}
                >
                  {c.title}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <style>{`@keyframes eq{from{transform:scaleY(.35)}to{transform:scaleY(1)}}`}</style>
    </>
  )
}

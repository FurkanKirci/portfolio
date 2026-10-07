'use client'

import { useEffect, useMemo, useRef } from 'react'
import { sound } from '@/lib/audio'
import { procs } from '@/lib/content'
import { useApp } from '@/lib/store'

/** /proc/<pid>: seçilen projenin vaka çalışması. Sağdan açılan panel; ESC ile kapanır, ← → ile gezilir. */
export function ProcPanel() {
  const pid = useApp((s) => s.proc)
  const list = useMemo(() => [...procs.filter((p) => p.featured), ...procs.filter((p) => !p.featured && p.pid !== 1)], [])
  const idx = list.findIndex((p) => p.pid === pid)
  const p = idx >= 0 ? list[idx] : null
  const panel = useRef<HTMLDivElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (p) {
      lastFocus.current = (document.activeElement as HTMLElement) ?? null
      panel.current?.focus()
      panel.current?.scrollTo({ top: 0 })
    } else lastFocus.current?.focus?.()
  }, [p])

  useEffect(() => {
    if (!p) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const next = list[(idx + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length]
        sound.click()
        useApp.getState().set({ proc: next.pid })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [p, idx, list])

  const close = () => {
    sound.panel(false)
    useApp.getState().set({ proc: null })
  }
  const go = (d: number) => {
    sound.click()
    useApp.getState().set({ proc: list[(idx + d + list.length) % list.length].pid })
  }

  const open = !!p
  return (
    <div className="fixed inset-0 z-[52]" style={{ pointerEvents: open ? 'auto' : 'none' }} aria-hidden={!open}>
      <div
        className="absolute inset-0 bg-[rgba(3,5,9,0.55)] transition-opacity duration-500"
        style={{ opacity: open ? 1 : 0 }}
        onClick={close}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={p ? `/proc/${p.pid} ${p.title}` : undefined}
        tabIndex={-1}
        data-lenis-prevent
        className="glass absolute bottom-0 right-0 top-0 w-[min(640px,100vw)] overflow-y-auto overscroll-contain outline-none transition-transform duration-[650ms]"
        style={{ transform: open ? 'translateX(0)' : 'translateX(104%)', transitionTimingFunction: 'var(--ease-out)' }}
      >
        {p && (
          <article className="px-[clamp(20px,4vw,44px)] pb-16 pt-[clamp(20px,3.4vw,36px)]">
            <header className="flex items-center justify-between gap-4">
              <p className="t-mono text-[12px] text-mute">
                <span className="text-ice">/proc/{p.pid}</span>
                <span className="mx-2 text-dim">·</span>
                {p.kthread ? `[${p.name}]` : p.name}
              </p>
              <div className="flex items-center gap-1">
                <button type="button" className="btn-ghost" onClick={() => go(-1)} aria-label="Önceki süreç">
                  ←
                </button>
                <button type="button" className="btn-ghost" onClick={() => go(1)} aria-label="Sonraki süreç">
                  →
                </button>
                <button type="button" className="btn-ghost" onClick={close} aria-label="Kapat (ESC)">
                  ESC
                </button>
              </div>
            </header>

            <h2 className="mt-10 t-display text-[clamp(2.1rem,4.2vw,3.4rem)] text-ink">{p.title}</h2>
            <p className="mt-3 text-[16px] text-mute">{p.cmd}</p>

            <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-[var(--hair)] py-4 t-mono text-[12px] sm:grid-cols-4">
              <div>
                <dt className="text-dim">DURUM</dt>
                <dd className={p.state === 'R' ? 'text-ok' : 'text-ink'}>{p.state === 'R' ? 'R · çalışıyor' : 'S · tamamlandı'}</dd>
              </div>
              <div>
                <dt className="text-dim">BAŞLADI</dt>
                <dd className="text-ink">{p.started}</dd>
              </div>
              <div>
                <dt className="text-dim">%CPU</dt>
                <dd className="text-ink tabular-nums">{p.cpu.toFixed(1)}</dd>
              </div>
              <div>
                <dt className="text-dim">ORG</dt>
                <dd className="truncate text-ink">{p.org || '—'}</dd>
              </div>
            </dl>

            {p.insight && <p className="mt-9 t-serif text-[clamp(1.6rem,2.6vw,2.2rem)] leading-[1.15] text-ink">“{p.insight}”</p>}

            {p.sections?.map((s) => (
              <section key={s.h} className="mt-9">
                <h3 className="t-label">
                  <span className="text-ice">#</span> {s.h}
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {s.items.map((it) => (
                    <li key={it} className="flex gap-3 text-[15px] leading-relaxed text-ink/90">
                      <span className="mt-[0.6em] h-px w-3 shrink-0 bg-[var(--ice)] opacity-60" aria-hidden="true" />
                      {it}
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {p.stack.length > 0 && (
              <section className="mt-10">
                <h3 className="t-label">
                  <span className="text-ice">#</span> yüklü modüller
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.stack.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {p.links && p.links.length > 0 && (
              <section className="mt-10 flex flex-wrap gap-3">
                {p.links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="t-mono text-[13px] text-ice underline decoration-[var(--hair-strong)] underline-offset-4 hover:decoration-[var(--ice)]"
                  >
                    {l.label} ↗
                  </a>
                ))}
              </section>
            )}

            <p className="mt-14 t-mono text-[11px] text-dim">← → ile diğer süreçler · ESC ile kapat</p>
          </article>
        )}
      </div>
    </div>
  )
}

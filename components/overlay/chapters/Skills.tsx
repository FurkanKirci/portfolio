'use client'

import { useState } from 'react'
import { sound } from '@/lib/audio'
import { cores } from '@/lib/content'
import { useApp } from '@/lib/store'
import { ChapterTag, Layer } from '../Layer'

/** 0x02 Çekirdek — her çekirdek bir yetenek alanı; modüller açılışta tek tek yüklenir. */
export function Skills() {
  const active = useApp((s) => s.core)
  const [open, setOpen] = useState<number | null>(null)

  const enter = (id: number) => {
    if (useApp.getState().core !== id) sound.hover()
    useApp.getState().set({ core: id })
  }
  const leave = () => useApp.getState().set({ core: null })

  return (
    <Layer id="kernel">
      <div className="scrim fade-in" data-in="0.02" data-out="0.97" />
      <div className="col-left">
        <ChapterTag id="kernel" inAt={0.02} outAt={0.95} />
        <ol className="compact-gap hit mt-6" onMouseLeave={leave}>
          {cores.map((c, i) => {
            const on = active === c.id
            const expanded = open === c.id
            return (
              <li key={c.key} className="fade-in" data-in={(0.05 + i * 0.035).toFixed(3)} data-out="0.95" data-len="0.03">
                <button
                  type="button"
                  className="group block w-full py-[7px] text-left"
                  onMouseEnter={() => enter(c.id)}
                  onFocus={() => enter(c.id)}
                  onBlur={leave}
                  onClick={() => {
                    sound.click()
                    setOpen(expanded ? null : c.id)
                  }}
                  aria-expanded={expanded}
                >
                  <div className="flex items-baseline gap-4">
                    <span className={`t-mono text-[11px] tracking-[0.12em] transition-colors ${on ? 'text-ice' : 'text-dim'}`}>cpu{c.id}</span>
                    <span className={`text-[16px] font-[520] tracking-[-0.01em] transition-colors ${on ? 'text-white' : 'text-ink'}`}>{c.label}</span>
                    <span className={`ml-auto h-px flex-1 origin-left transition-transform duration-500 ${on ? 'scale-x-100 bg-[var(--hair-strong)]' : 'scale-x-0 bg-transparent'}`} />
                  </div>
                  <p className="mt-1 pl-[3.1rem] t-mono text-[12px] leading-[1.55] text-mute">
                    {c.modules.map((m, k) => (
                      <span key={m}>
                        <span className={`whitespace-nowrap ${on ? 'text-ink' : ''}`}>{m}</span>
                        {k < c.modules.length - 1 && <span className="text-dim"> · </span>}
                      </span>
                    ))}
                  </p>
                  {c.notes && (
                    <div
                      className="grid pl-[3.1rem] transition-[grid-template-rows,opacity] duration-500"
                      style={{ gridTemplateRows: expanded || on ? '1fr' : '0fr', opacity: expanded || on ? 1 : 0 }}
                    >
                      <ul className="overflow-hidden">
                        {c.notes.map((n) => (
                          <li key={n} className="mt-1.5 flex gap-2 text-[13.5px] leading-snug text-ink/80">
                            <span className="text-ice" aria-hidden="true">
                              ›
                            </span>
                            {n}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
        <p className="compact-gap fade-in mt-5 t-mono text-[11px] text-dim" data-in="0.3" data-out="0.95">
          Çekirdeğin üzerine gel: kalıpta karşılığı aydınlanır. Sürükleyerek etrafına bakabilirsin.
        </p>
      </div>
    </Layer>
  )
}

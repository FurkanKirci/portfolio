'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { jumpTo } from '@/lib/actions'
import { sound } from '@/lib/audio'
import { chapters } from '@/lib/content'
import { useApp } from '@/lib/store'

/** F8 / Ctrl+K: "önyükleme aygıtı" seçer gibi bölümlere atla. */
export function BootMenu() {
  const open = useApp((s) => s.menu)
  const items = useMemo(() => chapters.slice(1), [])
  const [sel, setSel] = useState(0)
  const list = useRef<HTMLOListElement>(null)

  useEffect(() => {
    if (!open) return
    const current = items.findIndex((c) => c.id === useApp.getState().chapter)
    setSel(Math.max(0, current))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        sound.hover()
        setSel((s) => (s + (e.key === 'ArrowDown' ? 1 : -1) + items.length + 1) % (items.length + 1))
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        setSel((s) => {
          sound.click()
          if (s === items.length) useApp.getState().set({ menu: false, bios: true })
          else jumpTo(items[s].id)
          return s
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, items])

  useEffect(() => {
    if (open) (list.current?.querySelectorAll('button')[sel] as HTMLButtonElement | undefined)?.focus()
  }, [open, sel])

  return (
    <div className="fixed inset-0 z-[56] grid place-items-center p-[var(--gutter)]" style={{ pointerEvents: open ? 'auto' : 'none' }} aria-hidden={!open}>
      <div
        className="absolute inset-0 bg-[rgba(3,5,9,0.6)] transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0 }}
        onClick={() => useApp.getState().set({ menu: false })}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Önyükleme menüsü"
        className="glass relative w-[min(520px,100%)] p-6 transition-all duration-300"
        style={{ opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(10px) scale(0.98)' }}
      >
        <p className="t-label">
          <span className="text-ice">F8</span> · Önyükleme menüsü
        </p>
        <p className="mt-2 text-[15px] text-ink">Önyükleme aygıtını seç:</p>
        <ol ref={list} className="mt-5 space-y-[2px]">
          {items.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-baseline gap-4 px-3 py-2.5 text-left transition-colors"
                style={{ background: sel === i ? 'rgba(127,214,255,0.1)' : 'transparent' }}
                onMouseEnter={() => setSel(i)}
                onClick={() => {
                  sound.click()
                  jumpTo(c.id)
                }}
                tabIndex={open ? 0 : -1}
              >
                <span className={`t-mono text-[11px] ${sel === i ? 'text-ice' : 'text-dim'}`}>P{i}:</span>
                <span className="text-[16px] text-ink">{c.title}</span>
                <span className="ml-auto t-mono text-[11px] text-dim">
                  {c.code} · {c.cmd}
                </span>
              </button>
            </li>
          ))}
          <li className="pt-2">
            <button
              type="button"
              className="flex w-full items-baseline gap-4 border-t border-[var(--hair)] px-3 py-2.5 text-left"
              style={{ background: sel === items.length ? 'rgba(127,214,255,0.1)' : 'transparent' }}
              onMouseEnter={() => setSel(items.length)}
              onClick={() => {
                sound.click()
                useApp.getState().set({ menu: false, bios: true })
              }}
              tabIndex={open ? 0 : -1}
            >
              <span className="t-mono text-[11px] text-dim">DEL</span>
              <span className="text-[16px] text-ink">Kurulum (BIOS)</span>
            </button>
          </li>
        </ol>
        <p className="mt-5 t-mono text-[11px] text-dim">↑↓ seç · Enter başlat · ESC kapat</p>
      </div>
    </div>
  )
}

'use client'

import { useMemo, useRef, useState } from 'react'
import { sound } from '@/lib/audio'
import { channels, chapters, type Channel } from '@/lib/content'
import { cursorYear, formatYear } from '@/lib/film'
import { ChapterTag, Layer } from '../Layer'

interface Event {
  t: number
  stamp: string
  iface: string
  msg: string
  up: boolean
}

const IDX = chapters.findIndex((c) => c.id === 'dmesg')

/** 0x04 dmesg — mantık analizöründe zaman imleci ilerledikçe çekirdek kayıtları düşer. */
export function Dmesg() {
  const events = useMemo<Event[]>(() => {
    const list: Event[] = []
    for (const c of channels) {
      list.push({ t: c.from, stamp: c.upStamp, iface: c.id, msg: c.upMsg, up: true })
      if (c.to !== null && c.downMsg) list.push({ t: c.to, stamp: c.downStamp ?? '', iface: c.id, msg: c.downMsg, up: false })
    }
    return list.sort((a, b) => a.t - b.t)
  }, [])

  const [shown, setShown] = useState(0)
  const [active, setActive] = useState<Channel[]>([])
  const dateRef = useRef<HTMLSpanElement>(null)
  const monthRef = useRef<HTMLSpanElement>(null)
  const last = useRef({ count: 0, key: '' })

  const onLocal = (local: number, on: boolean) => {
    if (!on) return
    const y = cursorYear(IDX + local)
    const { year, month } = formatYear(y)
    if (dateRef.current && dateRef.current.textContent !== String(year)) dateRef.current.textContent = String(year)
    if (monthRef.current && monthRef.current.textContent !== month) monthRef.current.textContent = month
    const count = events.filter((e) => e.t <= y).length
    if (count !== last.current.count) {
      if (count > last.current.count) sound.chime(events[count - 1]?.up)
      last.current.count = count
      setShown(count)
    }
    const act = channels.filter((c) => c.from <= y && (c.to === null || c.to >= y))
    const key = act.map((c) => c.id).join(',')
    if (key !== last.current.key) {
      last.current.key = key
      setActive(act)
    }
  }

  const visible = events.slice(Math.max(0, shown - 7), shown)

  return (
    <Layer id="dmesg" onLocal={onLocal}>
      <div className="scrim-bottom fade-in" data-in="0.04" data-out="0.97" />
      <div className="scrim-right fade-in hidden md:block" data-in="0.06" data-out="0.97" />
      <div className="scrim fade-in" data-in="0.04" data-out="0.97" style={{ opacity: "calc(var(--o) * 0.6)" }} />
      <div className="absolute left-[var(--gutter)] top-[calc(var(--gutter)*0.6+56px)] w-[min(520px,calc(100vw-2*var(--gutter)))]">
        <ChapterTag id="dmesg" inAt={0.04} outAt={0.95} />
      </div>

      {/* İmleç ve etkin kanallar */}
      {/* İmleç ve etkin kanallar (mobilde başlığın altında, geniş ekranda sağda) */}
      <aside
        className="fade-in absolute left-[var(--gutter)] right-[var(--gutter)] top-[calc(var(--gutter)*0.6+212px)] md:left-auto md:top-[calc(var(--gutter)*0.6+64px)] md:w-[min(380px,34vw)]"
        data-in="0.08"
        data-out="0.95"
      >
        <p className="t-label">imleç</p>
        <p className="mt-2 flex items-baseline gap-3 t-mono">
          <span ref={dateRef} className="text-[clamp(1.8rem,3.6vw,3.4rem)] font-[500] leading-none tracking-[-0.03em] text-ink">
            2019
          </span>
          <span ref={monthRef} className="text-[15px] text-mute">
            Eylül
          </span>
        </p>
        <div className="mt-4 space-y-4 md:mt-6 md:space-y-5">
          {active.map((c) => (
            <article key={c.id} className="border-l border-[var(--hair-strong)] pl-4" style={{ animation: 'chanIn .5s var(--ease-out) both' }}>
              <p className="t-mono text-[11px] tracking-[0.12em] text-ice">
                {c.id} <span className="text-dim">· {c.label}</span>
              </p>
              <h3 className="mt-1 text-[16px] font-[520] text-ink md:text-[17px]">{c.role}</h3>
              <p className="text-[13px] text-mute md:text-[13.5px]">
                {c.org} · {c.place}
              </p>
              <p className="mt-1 t-mono text-[11px] text-dim">{c.range}</p>
              <ul className="mt-2 hidden space-y-1 md:block">
                {c.lines.map((l) => (
                  <li key={l} className="text-[13.5px] leading-snug text-ink/80">
                    {l}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </aside>

      {/* dmesg akışı */}
      <div
        className="fade-in absolute bottom-[calc(var(--gutter)*0.6+72px)] left-[var(--gutter)] w-[min(680px,calc(100vw-2*var(--gutter)))] t-mono text-[12px] leading-[1.75]"
        data-in="0.08"
        data-out="0.95"
        aria-live="polite"
      >
        <p className="mb-2 text-dim">$ dmesg --follow</p>
        {visible.map((e, i) => (
          <p
            key={`${e.iface}-${e.t}`}
            className={`truncate ${i < visible.length - 3 ? 'max-md:hidden' : ''}`}
            style={{ opacity: 0.45 + (0.55 * (i + 1)) / visible.length, animation: 'lineIn .35s var(--ease-out) both' }}
          >
            <span className="text-dim">[{e.stamp.padEnd(10, ' ')}]</span> <span className={e.up ? 'text-ice' : 'text-mute'}>{e.iface}:</span>{' '}
            <span className="text-ink/90">{e.msg}</span>
          </p>
        ))}
        <span className="caret" aria-hidden="true" />
      </div>
      <style>{`@keyframes lineIn{from{opacity:0;transform:translateY(6px)}}@keyframes chanIn{from{opacity:0;transform:translateX(10px)}}`}</style>
    </Layer>
  )
}

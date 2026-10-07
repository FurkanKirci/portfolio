'use client'

import { useMemo, useRef, useState } from 'react'
import { sound } from '@/lib/audio'
import { chapters, hops } from '@/lib/content'
import { activeHop } from '@/lib/film'
import { haversineKm } from '@/lib/math'
import { ChapterTag, Layer } from '../Layer'

const IDX = chapters.findIndex((c) => c.id === 'trace')

/** 0x05 traceroute — hayat rotası; her şehir bir atlama. Düsseldorf'a giden atlama yanıt vermez: uzaktandı. */
export function Journey() {
  const rows = useMemo(
    () =>
      hops.map((h, i) => {
        const prev = hops[i - 1]
        const km = prev && !h.remote && !prev.remote ? Math.round(haversineKm(prev.lat, prev.lon, h.lat, h.lon)) : null
        return { ...h, km }
      }),
    [],
  )
  const [reached, setReached] = useState(0)
  const last = useRef(0)

  const onLocal = (local: number, on: boolean) => {
    if (!on) return
    const n = activeHop(IDX + local)
    if (n !== last.current) {
      if (n > last.current) sound.packet()
      last.current = n
      setReached(n)
    }
  }

  return (
    <Layer id="trace" onLocal={onLocal}>
      <div className="scrim fade-in" data-in="0.04" data-out="0.97" />
      <div className="col-left">
        <ChapterTag id="trace" inAt={0.04} outAt={0.95} />
        <div className="compact-gap fade-in mt-7 t-mono text-[12.5px] leading-[1.9]" data-in="0.08" data-out="0.95">
          <p className="text-dim">traceroute to furkan (konya), 30 hops max, 60 byte packets</p>
          <ol className="mt-2">
            {rows.map((h, i) => {
              const done = i < reached
              const current = i === reached - 1
              return (
                <li
                  key={h.n}
                  className="grid grid-cols-[2ch_11ch_9ch_5ch_1fr] gap-x-3 transition-all duration-500"
                  style={{ opacity: done ? (current ? 1 : 0.62) : 0, transform: done ? 'none' : 'translateY(4px)' }}
                >
                  <span className="text-right text-dim">{h.n}</span>
                  {h.remote ? (
                    <>
                      <span className="text-heat">* * *</span>
                      <span className="text-dim">—</span>
                      <span className="text-dim">{h.year}</span>
                      <span className="truncate text-mute">
                        {h.city.toLowerCase()} · {h.note}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={current ? 'text-ice' : 'text-ink'}>{h.host}</span>
                      <span className="text-right tabular-nums text-mute">{h.km === null ? '—' : `${h.km} km`}</span>
                      <span className="text-dim">{h.year}</span>
                      <span className={`truncate ${current ? 'text-ink' : 'text-mute'}`}>{h.note}</span>
                    </>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
        <p className="fade-in mt-6 max-w-[46ch] text-[14px] leading-relaxed text-mute" data-in="0.86" data-out="0.95">
          Gerçek yükselti verisiyle çizilmiş Türkiye. Düsseldorf atlaması yanıt vermiyor: o dönem paketlerim oraya uzaktan gidip geldi.
        </p>
      </div>
    </Layer>
  )
}

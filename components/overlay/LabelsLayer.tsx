'use client'

import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { labels } from '@/components/canvas/labels'
import type { WorldId } from '@/components/canvas/uniforms'
import { boardLayout } from '@/components/canvas/board/layout'
import { floorplan } from '@/components/canvas/city/floorplan'
import { CHANNEL_Z, YEAR_Z, analyzerX } from '@/components/canvas/analyzer/geometry'
import { particleState } from '@/components/canvas/particles/Particles'
import { lonLatToXZ } from '@/components/canvas/terrain/data'
import { BOOT } from '@/lib/boot'
import { channels, cores, hops, timeline } from '@/lib/content'
import { activeHop } from '@/lib/film'
import { LANE_W } from '@/lib/procs'
import { smoothstep } from '@/lib/math'
import { sound } from '@/lib/audio'
import { useApp } from '@/lib/store'

/** 3B sahnedeki bir noktaya iliştirilmiş etiket. */
export function Label3D({
  id,
  world,
  pos,
  visible,
  update,
  children,
  className = '',
}: {
  id: string
  world: WorldId
  pos: [number, number, number]
  visible: (F: number) => number
  update?: (p: THREE.Vector3) => void
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const vis = useRef(visible)
  const upd = useRef(update)
  useEffect(() => {
    vis.current = visible
    upd.current = update
  })
  const [x, y, z] = pos
  useEffect(() => {
    const el = ref.current
    if (!el) return
    labels.set(id, {
      el,
      world,
      pos: new THREE.Vector3(x, y, z),
      visible: (F) => vis.current(F),
      update: (p) => upd.current?.(p),
    })
    return () => labels.remove(id)
  }, [id, world, x, y, z])
  return (
    <div ref={ref} className={`absolute left-0 top-0 ${className}`} style={{ opacity: 0, visibility: 'hidden' }}>
      {children}
    </div>
  )
}

/** Açılış sinematiği zamanını (negatif film zamanı) saniyeye çevirir. */
const bootSec = (F: number) => F + BOOT.end
const win = (x: number, a: number, b: number, c: number, d: number) => smoothstep(a, b, x) * (1 - smoothstep(c, d, x))

export function LabelsLayer() {
  const L = boardLayout()
  const [xx, xy, xz] = L.anchors.xtal
  const [qx, qy, qz] = L.anchors.qcode
  const [lx, ly, lz] = L.anchors.led
  const towers = useMemo(() => floorplan(1).districts.filter((d) => d.id < 6), [])
  const years = useMemo(() => {
    const out: number[] = []
    for (let y = Math.ceil(timeline.start); y <= Math.floor(timeline.end); y++) out.push(y)
    return out
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[8] overflow-hidden" style={{ textShadow: '0 1px 14px rgba(5,7,11,0.75)' }} aria-hidden="true">
      {/* Kart */}
      <Label3D id="xtal" world="board" pos={[xx, xy + 1.25, xz]} visible={(F) => (F < 0 && F > -50 ? win(bootSec(F), 1.75, 2.0, 2.8, 3.1) : 0)}>
        <div
          className="-translate-x-1/2 -translate-y-full whitespace-nowrap px-10 pb-4 pt-3 text-center"
          style={{ background: 'radial-gradient(closest-side, rgba(5,7,11,0.7), rgba(5,7,11,0.35) 62%, rgba(5,7,11,0))', textShadow: '0 1px 16px rgba(5,7,11,0.8)' }}
        >
          <p className="t-label text-ice">X1 · 25.000 MHz</p>
          <p className="mt-1 t-serif text-[19px] text-ink">Her şey bir saat sinyaliyle başlar.</p>
        </div>
      </Label3D>
      <Label3D id="qcode" world="board" pos={[qx, qy + 0.2, qz]} visible={(F) => (F < 0 && F > -50 ? win(bootSec(F), 3.4, 3.6, 4.5, 4.8) : 0)}>
        <p className="-translate-x-1/2 -translate-y-full whitespace-nowrap pb-2 t-label">Q-Code · bellek eğitimi</p>
      </Label3D>
      <Label3D id="sbled" world="board" pos={[lx, ly + 0.15, lz]} visible={(F) => (F > 6.86 ? smoothstep(6.88, 6.94, F) : 0)}>
        <p className="-translate-x-1/2 translate-y-4 whitespace-nowrap t-label">SB_PWR · bekleme</p>
      </Label3D>

      {/* Silikon şehir: çekirdek kuleleri */}
      {towers.map((d) => {
        const c = cores[d.id]
        return (
          <Label3D
            key={d.id}
            id={`core-${d.id}`}
            className="max-sm:hidden"
            world="city"
            pos={[d.tower[0], d.tower[1] + 1.4, d.tower[2]]}
            visible={(F) => win(F, 2.06 + d.id * 0.035, 2.12 + d.id * 0.035, 2.86, 2.95)}
          >
            <button
              type="button"
              className="pointer-events-auto -translate-x-1/2 -translate-y-full whitespace-nowrap pb-2 text-left"
              onMouseEnter={() => {
                sound.hover()
                useApp.getState().set({ core: d.id })
              }}
              onMouseLeave={() => useApp.getState().set({ core: null })}
              tabIndex={-1}
            >
              <span className="block t-mono text-[10px] tracking-[0.14em] text-ice">cpu{d.id}</span>
              <span className="block text-[13px] text-ink">{c.label}</span>
              <span className="mx-auto mt-1 block h-5 w-px bg-gradient-to-b from-[var(--ice)] to-transparent" />
            </button>
          </Label3D>
        )
      })}

      {/* Zamanlayıcı şeritleri */}
      {Array.from({ length: 8 }, (_, i) => (
        <Label3D key={i} id={`lane-${i}`} world="sched" pos={[(i - 3.5) * LANE_W, 0.05, -12]} visible={(F) => win(F, 3.12, 3.18, 3.88, 3.93) * 0.8}>
          <p className="-translate-x-1/2 t-mono text-[10px] tracking-[0.12em] text-dim">cpu{i}</p>
        </Label3D>
      ))}

      {/* Mantık analizörü: imleçle kayan kanal adları ve yıllar */}
      {['CLK', ...channels.map((c) => c.id)].map((name, i) => (
        <Label3D
          key={name}
          id={`chan-${name}`}
          className="max-sm:hidden"
          world="analyzer"
          pos={[0, 0.25, CHANNEL_Z[i]]}
          update={(p) => {
            p.x = particleState.cursorX - 1.2
          }}
          visible={(F) => win(F, 4.1, 4.16, 4.9, 4.95)}
        >
          <p className="-translate-x-full -translate-y-1/2 whitespace-nowrap pr-2 t-mono text-[11px]">
            <span className={i === 0 ? 'text-dim' : 'text-ice'}>{name}</span>
            {i > 0 && <span className="ml-2 text-dim">{channels[i - 1].label}</span>}
          </p>
        </Label3D>
      ))}
      {years.map((y) => (
        <Label3D key={y} id={`year-${y}`} world="analyzer" pos={[analyzerX(y), 0, YEAR_Z]} visible={(F) => win(F, 4.06, 4.12, 4.92, 4.97)}>
          <p className="-translate-x-1/2 -translate-y-full pb-1 t-mono text-[11px] text-mute">{y}</p>
        </Label3D>
      ))}

      {/* Türkiye: atlamalar */}
      {hops.map((h, i) => {
        if (h.remote) return null
        const first = hops.findIndex((x) => x.host === h.host) === i
        if (!first) return null
        const [x, z] = lonLatToXZ(h.lon, h.lat)
        const years = hops.filter((x) => x.host === h.host).map((x) => x.year)
        const idx = hops.map((x, k) => (x.host === h.host ? k : -1)).filter((k) => k >= 0)
        return (
          <Label3D
            key={h.host}
            id={`hop-${h.host}`}
            className="max-sm:hidden"
            world="terrain"
            pos={[x, 7.6, z]}
            visible={(F) => {
              const n = activeHop(F)
              const reached = idx.some((k) => k < n)
              return reached ? win(F, 5.06, 5.1, 5.97, 6.02) : 0
            }}
          >
            <div className="-translate-x-1/2 -translate-y-full whitespace-nowrap pb-2 text-center">
              <p className="text-[15px] font-[520] text-ink">{h.city}</p>
              <p className="t-mono text-[10px] tracking-[0.12em] text-ice">{years.join(' · ')}</p>
            </div>
          </Label3D>
        )
      })}
      <Label3D
        id="hop-remote"
        className="max-sm:hidden"
        world="terrain"
        pos={(() => {
          const ist = hops.find((h) => h.host === 'istanbul')!
          const [x, z] = lonLatToXZ(ist.lon, ist.lat)
          return [x - 22, 9, z - 13] as [number, number, number]
        })()}
        visible={(F) => (activeHop(F) >= 4 ? win(F, 5.06, 5.1, 5.97, 6.02) : 0)}
      >
        <div className="-translate-x-1/2 -translate-y-full whitespace-nowrap pb-2 text-center">
          <p className="t-mono text-[13px] text-heat">* * *</p>
          <p className="t-mono text-[10px] tracking-[0.12em] text-mute">düsseldorf · uzaktan</p>
        </div>
      </Label3D>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { sound } from '@/lib/audio'
import { procs, type Proc } from '@/lib/content'
import { useApp } from '@/lib/store'
import { ChapterTag, Layer } from '../Layer'

interface Row {
  p: Proc
  prefix: string
  depth: number
}

/** ps --forest benzeri ağaç: önce ebeveyn, sonra çocuklar. */
function forest(): Row[] {
  const byParent = new Map<number, Proc[]>()
  for (const p of procs) {
    if (p.parent === undefined) continue
    const list = byParent.get(p.parent) ?? []
    list.push(p)
    byParent.set(p.parent, list)
  }
  const rows: Row[] = []
  const walk = (pid: number, prefix: string, depth: number) => {
    const kids = byParent.get(pid) ?? []
    kids.forEach((k, i) => {
      const last = i === kids.length - 1
      rows.push({ p: k, prefix: depth === 0 ? '' : prefix + (last ? '└─ ' : '├─ '), depth })
      walk(k.pid, depth === 0 ? '' : prefix + (last ? '   ' : '│  '), depth + 1)
    })
  }
  const root = procs.find((p) => p.pid === 1)!
  rows.push({ p: root, prefix: '', depth: -1 })
  walk(1, '', 0)
  return rows
}

type KillState = { dead: boolean; hist: number[] }

/** 0x03 Süreçler — her proje çalışan bir süreç. Tıkla: /proc/<pid>. Fareyi üzerine getir: zamanlayıcı şeritlerinde dilimleri parlar. */
export function Projects() {
  const rows = useMemo(forest, [])
  const [cpu, setCpu] = useState<Record<number, number>>({})
  const [kills, setKills] = useState<Record<number, KillState>>({})
  const active = useRef(false)

  // top gibi: çalışan süreçlerin %CPU değeri canlı oynar
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!active.current) return
      setCpu(() => {
        const next: Record<number, number> = {}
        for (const { p } of rows) {
          if (p.state !== 'R') continue
          const jitter = (Math.random() - 0.5) * Math.max(1.2, p.cpu * 0.22)
          next[p.pid] = Math.max(0.1, p.cpu + jitter)
        }
        return next
      })
    }, 1300)
    return () => window.clearInterval(id)
  }, [rows])

  const kill = (p: Proc) => {
    const app = useApp.getState()
    if (p.pid === 1) {
      sound.error()
      app.toast(`kill -9 1\ninit öldürülemez. (Denedin, değil mi?)`, 'warn')
      return
    }
    sound.error()
    const now = Date.now()
    const prev = kills[p.pid] ?? { dead: false, hist: [] }
    const hist = [...prev.hist.filter((t) => now - t < 30000), now]
    setKills((k) => ({ ...k, [p.pid]: { dead: true, hist } }))
    app.toast(`kill -9 ${p.pid}\n${p.name}: sonlandırıldı (SIGKILL)`, 'err')
    const tooFast = hist.length >= 3
    window.setTimeout(
      () => {
        setKills((k) => ({ ...k, [p.pid]: { dead: false, hist: k[p.pid]?.hist ?? hist } }))
        sound.restart()
        useApp
          .getState()
          .toast(
            tooFast
              ? `systemd[1]: ${p.name}.service: Start request repeated too quickly.\nBiraz dinlendirdikten sonra yeniden başlatıldı.`
              : `systemd[1]: ${p.name}.service: Scheduled restart job, restart counter is at ${hist.length}.\nSüreç yeniden ayağa kalktı.`,
            'ok',
          )
      },
      tooFast ? 7000 : 2600,
    )
  }

  const open = (p: Proc) => {
    sound.panel(true)
    useApp.getState().set({ proc: p.pid })
  }

  return (
    <Layer id="procs" onLocal={(_, on) => (active.current = on)}>
      <div className="scrim fade-in" data-in="0.06" data-out="0.97" />
      <div className="col-left !w-auto max-w-[calc(100vw-2*var(--gutter))]">
        <ChapterTag id="procs" inAt={0.06} outAt={0.95} />
        <div className="compact-gap fade-in hit mt-6 max-w-full" data-in="0.1" data-out="0.95">
          <table className="ps" onMouseLeave={() => useApp.getState().set({ hoverProc: null })}>
            <thead>
              <tr>
                <th>PID</th>
                <th>S</th>
                <th className="text-right">%CPU</th>
                <th className="hidden lg:table-cell">Başladı</th>
                <th>Komut</th>
                <th className="hidden xl:table-cell" />
                <th aria-label="kill" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, prefix }) => {
                const k = kills[p.pid]
                const dead = !!k?.dead
                const state = dead ? 'Z' : p.state
                const value = dead ? 0 : (cpu[p.pid] ?? p.cpu)
                const clickable = p.pid !== 1
                return (
                  <tr
                    key={p.pid}
                    className={clickable ? 'row group' : ''}
                    data-dead={dead ? '1' : '0'}
                    tabIndex={clickable ? 0 : -1}
                    onMouseEnter={() => {
                      if (!clickable) return
                      sound.hover()
                      useApp.getState().set({ hoverProc: p.pid })
                    }}
                    onFocus={() => clickable && useApp.getState().set({ hoverProc: p.pid })}
                    onClick={() => clickable && !dead && open(p)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && clickable && !dead) {
                        e.preventDefault()
                        open(p)
                      }
                    }}
                    aria-label={clickable ? `${p.title}: ayrıntılar` : undefined}
                  >
                    <td className="text-dim">{p.pid}</td>
                    <td className={state === 'R' ? 'text-ok' : state === 'Z' ? 'text-heat' : 'text-mute'}>{state}</td>
                    <td className="text-right tabular-nums text-mute">{value.toFixed(1)}</td>
                    <td className="hidden text-dim lg:table-cell">{p.started}</td>
                    <td>
                      <span className="text-dim">{prefix}</span>
                      <span className={p.featured ? 'text-ink' : p.kthread ? 'text-mute' : 'text-ink/80'}>
                        {p.kthread ? `[${p.name}]` : p.name}
                        {dead && <span className="text-heat"> &lt;defunct&gt;</span>}
                      </span>
                      {p.featured && !dead && <span className="ml-2 text-ice opacity-0 transition-opacity group-hover:opacity-100">→</span>}
                    </td>
                    <td className="hidden max-w-[34ch] truncate text-[12px] text-dim xl:table-cell">{p.cmd}</td>
                    <td className="pl-2">
                      <button
                        type="button"
                        className="t-mono text-[10px] tracking-[0.1em] text-dim opacity-0 transition-opacity hover:text-heat group-hover:opacity-100 focus:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          kill(p)
                        }}
                        aria-label={`${p.name} sürecini sonlandır (kill -9)`}
                        tabIndex={-1}
                      >
                        kill -9
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="compact-gap fade-in mt-5 t-mono text-[11px] text-dim" data-in="0.16" data-out="0.95">
          Bir sürece tıkla: /proc/&lt;pid&gt; açılır. İstersen öldürmeyi de deneyebilirsin.
        </p>
      </div>
    </Layer>
  )
}

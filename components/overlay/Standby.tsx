'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { powerOn } from '@/lib/actions'
import { sound } from '@/lib/audio'
import { profile } from '@/lib/content'
import { onFrame } from '@/lib/loop'
import { useApp } from '@/lib/store'
import { labels } from '@/components/canvas/labels'
import { boardLayout } from '@/components/canvas/board/layout'
import { sys } from '@/components/canvas/system'

const HOLD_MS = 650

/**
 * Bekleme ekranı (ACPI S5): karanlıkta nefes alan bir LED ve kartın üzerindeki güç düğmesi.
 * Düğme halkası 3B düğmenin ekrandaki yerine oturur; basılı tuttukça dolar.
 */
export function Standby() {
  const power = useApp((s) => s.power)
  const ready = useApp((s) => s.ready)
  const webgl = useApp((s) => s.webgl)
  const anchor = useRef<HTMLDivElement>(null)
  const ring = useRef<SVGCircleElement>(null)
  const [hint, setHint] = useState(false)
  const holding = useRef<{ start: number } | null>(null)

  useEffect(() => {
    const el = anchor.current
    if (!el) return
    const [x, y, z] = boardLayout().anchors.button
    labels.set('power', { el, world: 'board', pos: new THREE.Vector3(x, y, z), visible: (F) => (F <= -99 ? 1 : 0) })
    return () => labels.remove('power')
  }, [])

  useEffect(
    () =>
      onFrame(() => {
        const h = holding.current
        if (h) {
          sys.hold = Math.min(1, (performance.now() - h.start) / HOLD_MS)
          if (sys.hold >= 1) {
            holding.current = null
            sys.hold = 0
            powerOn()
          }
        }
        if (ring.current) ring.current.style.strokeDashoffset = String(301.6 * (1 - sys.hold))
      }),
    [],
  )

  const start = (e: React.PointerEvent) => {
    if (!ready) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    sound.chargeStart()
    holding.current = { start: performance.now() }
    setHint(false)
  }
  const cancel = () => {
    if (!holding.current) return
    const held = performance.now() - holding.current.start
    holding.current = null
    sys.hold = 0
    sound.chargeStop()
    if (held < HOLD_MS * 0.6) setHint(true)
  }

  const off = power === 'off'

  return (
    <div
      className="fixed inset-0 z-30 transition-opacity duration-700"
      style={{ opacity: off ? 1 : 0, visibility: off ? 'visible' : 'hidden', pointerEvents: 'none' }}
      aria-hidden={!off}
    >
      <div className="absolute left-[var(--gutter)] top-[calc(var(--gutter)*0.6)] flex items-center gap-3 t-label">
        <span className="text-ink">{profile.board}</span>
        <span className="hidden h-px w-6 bg-[var(--hair-strong)] sm:block" />
        <span className="hidden sm:inline">S5 · bekleme</span>
      </div>

      {/* 3B düğmeye oturan halka */}
      <div
        ref={anchor}
        className="pointer-events-none absolute left-0 top-0"
        style={{ transform: webgl ? 'translate3d(50vw, 62vh, 0)' : 'translate3d(50vw, 55vh, 0)' }}
      >
        <button
          type="button"
          aria-label="Güç düğmesi. Açmak için basılı tutun."
          disabled={!ready}
          onPointerDown={start}
          onPointerUp={cancel}
          onPointerCancel={cancel}
          onPointerLeave={cancel}
          onContextMenu={(e) => e.preventDefault()}
          className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full outline-offset-8 select-none touch-none disabled:cursor-wait"
          style={{ width: 108, height: 108, WebkitTapHighlightColor: 'transparent' }}
        >
          <svg className="power-ring absolute inset-0" viewBox="0 0 108 108" aria-hidden="true">
            <circle className="track" cx="54" cy="54" r="48" fill="none" strokeWidth="1" />
            <circle
              ref={ring}
              className="fill"
              cx="54"
              cy="54"
              r="48"
              fill="none"
              strokeWidth="1.5"
              strokeDasharray="301.6"
              strokeDashoffset="301.6"
              transform="rotate(-90 54 54)"
            />
          </svg>
          {!webgl && (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ice)" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M12 3v8" />
              <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
            </svg>
          )}
        </button>
        <div
          className="absolute left-1/2 top-[58px] -translate-x-1/2 whitespace-nowrap px-10 py-3 text-center"
          style={{ background: 'radial-gradient(closest-side, rgba(5,7,11,0.82), rgba(5,7,11,0.5) 60%, rgba(5,7,11,0))' }}
        >
          <p className="t-label text-ink" style={{ letterSpacing: '0.2em' }}>
            {ready ? (hint ? 'Basılı tutman gerekiyor' : 'Açmak için basılı tut') : 'Hazırlanıyor…'}
          </p>
          <p className="mt-2 t-mono text-[11px] text-mute pointer-coarse:hidden">ya da Enter’a basılı tut</p>
        </div>
      </div>

      <div className="absolute bottom-[calc(var(--gutter)*0.6)] left-[var(--gutter)] right-[var(--gutter)] flex items-end justify-between gap-6">
        <p className="max-w-[34ch] t-mono text-[11px] leading-relaxed text-dim">
          Bu site bir bilgisayarın açılıştan kapanışa ömrünü anlatıyor. Sesli; sağ üstten ya da M ile kapatabilirsin.
        </p>
        <button
          type="button"
          className="btn-ghost pointer-events-auto hit shrink-0 whitespace-nowrap"
          disabled={!ready}
          onClick={() => {
            sound.init()
            powerOn({ fast: true })
          }}
        >
          Hızlı açılış →
        </button>
      </div>
    </div>
  )
}

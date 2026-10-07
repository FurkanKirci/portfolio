'use client'

import { useEffect, useRef } from 'react'
import { onFrame } from '@/lib/loop'
import { useApp } from '@/lib/store'
import { flash } from '@/components/canvas/Director'

/** Tam ekran perdeler: çipe dalarkenki parlama, uzun atlamalardaki karartma ve kernel panic. */
export function Veils() {
  const flashRef = useRef<HTMLDivElement>(null)
  const blackout = useApp((s) => s.blackout)
  const panic = useApp((s) => s.panic)

  useEffect(
    () =>
      onFrame(() => {
        const el = flashRef.current
        if (!el) return
        const v = flash.value
        el.style.opacity = v.toFixed(3)
        el.style.visibility = v > 0.002 ? 'visible' : 'hidden'
      }),
    [],
  )

  return (
    <>
      <div
        ref={flashRef}
        className="pointer-events-none fixed inset-0 z-[5]"
        style={{
          background: 'radial-gradient(60% 60% at 50% 50%, rgba(214,240,255,0.95), rgba(127,214,255,0.35) 55%, rgba(5,7,11,0) 100%)',
          mixBlendMode: 'screen',
          opacity: 0,
          visibility: 'hidden',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-[60] bg-[var(--bg)] transition-opacity"
        style={{ opacity: blackout ? 1 : 0, transitionDuration: blackout ? '240ms' : '520ms' }}
      />
      {panic && (
        <div className="fixed inset-0 z-[70] overflow-hidden bg-[#05070b] p-[var(--gutter)] t-mono text-[13px] leading-relaxed text-ink" role="alert">
          <pre className="whitespace-pre-wrap">
            {`[  142.071337] Kernel panic - not syncing: Attempted to kill init! exitcode=0x00000009
[  142.071339] CPU: 0 PID: 1 Comm: furkan Not tainted 6.6.0-furkan #1
[  142.071340] Hardware name: MFK-B26 Rev 1.0
[  142.071342] Call Trace:
[  142.071343]  <TASK>
[  142.071344]  dump_stack_lvl+0x48/0x70
[  142.071346]  panic+0x1a4/0x370
[  142.071348]  do_exit.cold+0x15/0x15
[  142.071349]  rm_rf_root+0x2a/0x2a   <- buradasın
[  142.071351]  </TASK>
[  142.071352] ---[ end Kernel panic - not syncing: Attempted to kill init! ]---

`}
          </pre>
          <p className="mt-6 text-mute">Kök dizini silmeye çalıştın. Sistem bunu sevmedi. 4 saniye içinde yeniden başlatılıyor…</p>
        </div>
      )}
    </>
  )
}

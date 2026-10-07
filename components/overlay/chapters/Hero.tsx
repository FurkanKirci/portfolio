'use client'

import { BOOT } from '@/lib/boot'
import { profile } from '@/lib/content'
import { frame, useApp } from '@/lib/store'
import { Layer } from '../Layer'

/** OEM açılış ekranı: logo yerine isim. Açılışın sonunda belirir, kaydırınca çipe dalınır. */
export function Hero() {
  return (
    <Layer
      id="hero"
      extraActive={() => {
        const app = useApp.getState()
        if (app.power !== 'booting' || frame.bootT < BOOT.splash) return null
        return Math.min(0, -0.1 + ((frame.bootT - BOOT.splash) / 0.9) * 0.1)
      }}
    >
      <div className="absolute inset-x-[var(--gutter)] bottom-[calc(var(--gutter)*0.6+64px)] flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-[min(92vw,1100px)]">
          <p className="fade-in t-label" data-in="-0.1" data-out="0.55">
            <span className="text-ice">OEM</span>
            <span className="mx-3 text-dim">·</span>
            {profile.board} {profile.boardRev}
          </p>
          {/* Asıl h1 ekran okuyucular için SrContent içinde; burası onun görsel karşılığı */}
          <p className="fade-in mt-5 t-display text-[clamp(3.1rem,9.2vw,9.8rem)] text-ink" data-in="-0.09" data-out="0.6" aria-hidden="true">
            Muhammed
            <br />
            Furkan Kırcı
          </p>
          <p className="fade-in mt-5 t-serif text-[clamp(1.25rem,2.2vw,2rem)] text-mute" data-in="-0.07" data-out="0.6">
            {profile.role} — {profile.city}
          </p>
        </div>
        <div className="hero-scroll-hint fade-in flex items-center gap-4 md:flex-col md:items-end" data-in="-0.04" data-out="0.35">
          <span className="t-label">Kaydır</span>
          <span className="scroll-hint-line" aria-hidden="true" />
        </div>
      </div>
    </Layer>
  )
}

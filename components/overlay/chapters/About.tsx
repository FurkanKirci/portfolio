'use client'

import { about } from '@/lib/content'
import { ChapterTag, Layer } from '../Layer'

/** 0x01 POST — kendini test eden sistem: kısa bir tanıtım ve öz-test sonuçları. */
export function About() {
  return (
    <Layer id="post">
      <div className="scrim fade-in" data-in="0.24" data-out="0.97" />
      <div className="col-left">
        <ChapterTag id="post" inAt={0.26} outAt={0.96} />
        <p className="compact-gap fade-in mt-8 text-[clamp(1.35rem,2.15vw,2.05rem)] font-[440] leading-[1.22] tracking-[-0.015em] text-ink" data-in="0.32" data-out="0.96">
          {about.lede}
        </p>
        <p className="fade-in mt-4 max-w-[52ch] text-[16px] text-mute" data-in="0.36" data-out="0.96">
          {about.sub}
        </p>
        <ul className="compact-gap mt-7 space-y-1.5 t-mono text-[12.5px]">
          {about.selfTest.map((row, i) => (
            <li key={row.k} className="fade-in flex gap-4" data-in={(0.42 + i * 0.035).toFixed(3)} data-out="0.96" data-len="0.02">
              <span className="shrink-0 text-ice">[ OK ]</span>
              <span className="w-16 shrink-0 text-dim">{row.k}</span>
              <span className="text-ink/90">{row.v}</span>
            </li>
          ))}
        </ul>
      </div>
    </Layer>
  )
}

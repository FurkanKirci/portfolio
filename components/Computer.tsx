'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { chapters } from '@/lib/content'
import { startLoop } from '@/lib/loop'
import { installDebug } from '@/lib/debug'
import { loadSettings, useApp } from '@/lib/store'
import { detectTier, isSoftwareRenderer } from '@/lib/quality'
import { Controllers } from './system/Controllers'
import { Standby } from './overlay/Standby'
import { BootScreen } from './overlay/BootScreen'
import { Hud } from './overlay/Hud'
import { Veils } from './overlay/Veils'
import { Hero } from './overlay/chapters/Hero'
import { About } from './overlay/chapters/About'
import { Skills } from './overlay/chapters/Skills'
import { Projects } from './overlay/chapters/Projects'
import { Dmesg } from './overlay/chapters/Dmesg'
import { Journey } from './overlay/chapters/Journey'
import { Contact, type SendFn } from './overlay/chapters/Contact'
import { LabelsLayer } from './overlay/LabelsLayer'
import { ProcPanel } from './overlay/ProcPanel'
import { Bios } from './overlay/Bios'
import { BootMenu } from './overlay/BootMenu'
import { Toasts } from './overlay/Toasts'

const Stage = dynamic(() => import('./canvas/Stage'), { ssr: false })

/** Sahne kurulmadan önce bir deneme bağlamıyla ekran kartını tanı: kademe baştan doğru seçilsin, sahne iki kez kurulmasın. */
function probeGPU() {
  try {
    const c = document.createElement('canvas')
    const ctx = c.getContext('webgl2')
    if (!ctx) return { ok: false, tier: 'low' as const, software: false }
    const tier = detectTier(ctx)
    const software = isSoftwareRenderer(ctx)
    ctx.getExtension('WEBGL_lose_context')?.loseContext()
    return { ok: true, tier, software }
  } catch {
    return { ok: false, tier: 'low' as const, software: false }
  }
}

export default function Computer({ send }: { send: SendFn }) {
  const webgl = useApp((s) => s.webgl)
  const [inited, setInited] = useState(false)

  useEffect(() => {
    const gpu = probeGPU()
    const settings = loadSettings()
    // ?q=low|medium|high|ultra → kaliteyi bu oturum için zorla (test ve karşılaştırma için)
    const q = new URLSearchParams(window.location.search).get('q')
    if (q === 'low' || q === 'medium' || q === 'high' || q === 'ultra') settings.quality = q
    useApp.getState().set({ settings, webgl: gpu.ok, ready: !gpu.ok, autoTier: gpu.software ? 'low' : gpu.tier, softwareGL: gpu.software })
    setInited(true)
    startLoop()
    if (process.env.NODE_ENV !== 'production' || new URLSearchParams(window.location.search).has('debug')) installDebug()
  }, [])

  // Sıra content.ts → chapters ile aynı olmalı
  const layers = [
    <Hero key="hero" />,
    <About key="post" />,
    <Skills key="kernel" />,
    <Projects key="procs" />,
    <Dmesg key="dmesg" />,
    <Journey key="trace" />,
    <Contact key="shutdown" send={send} />,
  ]

  return (
    <>
      {inited && webgl && <Stage />}
      <Veils />
      <LabelsLayer />
      <main id="icerik">
        {chapters.map((c, i) => (
          <section key={c.id} id={`ch-${c.id}`} className="chapter" style={{ height: `${c.length * 100}vh` }} aria-label={c.title}>
            {layers[i]}
          </section>
        ))}
      </main>
      <Standby />
      <BootScreen />
      <Hud />
      <ProcPanel />
      <BootMenu />
      <Bios />
      <Toasts />
      <Controllers />
    </>
  )
}

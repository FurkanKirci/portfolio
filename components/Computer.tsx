'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { chapters } from '@/lib/content'
import { startLoop } from '@/lib/loop'
import { installDebug } from '@/lib/debug'
import { loadSettings, useApp } from '@/lib/store'
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

function hasWebGL2() {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2')
  } catch {
    return false
  }
}

export default function Computer({ send }: { send: SendFn }) {
  const webgl = useApp((s) => s.webgl)

  useEffect(() => {
    const ok = hasWebGL2()
    const settings = loadSettings()
    // ?q=low|medium|high|ultra → kaliteyi bu oturum için zorla (test ve karşılaştırma için)
    const q = new URLSearchParams(window.location.search).get('q')
    if (q === 'low' || q === 'medium' || q === 'high' || q === 'ultra') settings.quality = q
    useApp.getState().set({ settings, webgl: ok, ready: !ok })
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
      {webgl && <Stage />}
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

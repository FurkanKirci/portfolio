'use client'

import { Environment, Lightformer } from '@react-three/drei'
import { Canvas, advance, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import * as THREE from 'three'
import { setRenderer } from '@/lib/loop'
import { detectTier, stepDown, tiers } from '@/lib/quality'
import { frame, resolvedTier, useApp, type Tier } from '@/lib/store'
import { Board } from './board/Board'
import { Director } from './Director'
import { Effects } from './Effects'
import { Particles } from './particles/Particles'
import { Motes } from './Motes'
import { City } from './city/City'
import { Scheduler } from './scheduler/Scheduler'
import { Analyzer } from './analyzer/Analyzer'
import { Terrain } from './terrain/Terrain'

/** Kare hızı uzun süre düşük kalırsa kaliteyi bir kademe indirir. */
function AutoQuality() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const auto = detectTier(gl.getContext())
    useApp.getState().set({ autoTier: auto })
    let low = 0
    let samples = 0
    const id = window.setInterval(() => {
      const app = useApp.getState()
      if (app.settings.quality !== 'auto' || app.power !== 'on' || document.hidden) return
      samples++
      if (frame.fps < 38) low++
      else low = Math.max(0, low - 1)
      if (low >= 4 && samples > 6) {
        const next = stepDown(app.autoTier)
        if (next !== app.autoTier) {
          app.set({ autoTier: next })
          low = 0
        }
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [gl])
  return null
}

/** Sahneyi derleyip hazır olduğunu bildirir (güç düğmesi o zaman etkinleşir). */
function Warmup() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      useApp.getState().set({ ready: true })
    }
    const t = window.setTimeout(finish, 6000)
    // Bütün dünyaların shader'larını önceden derle: ilk geçişlerde takılma olmasın
    const hidden: THREE.Object3D[] = []
    scene.traverse((o) => {
      if (!o.visible) {
        o.visible = true
        hidden.push(o)
      }
    })
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .finally(() => {
        hidden.forEach((o) => (o.visible = false))
        window.setTimeout(finish, 120)
      })
    return () => window.clearTimeout(t)
  }, [gl, scene, camera])
  return null
}

function World({ tier }: { tier: Tier }) {
  const cfg = tiers[tier]
  const settings = useApp((s) => s.settings)
  return (
    <>
      <color attach="background" args={['#05070b']} />
      <fogExp2 attach="fog" args={['#05070b', 0.0035]} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={1.4} color="#bcd6ff" position={[0, 9, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[14, 10, 1]} />
        <Lightformer form="rect" intensity={6} color="#d8ecff" position={[-9, 3, 2]} rotation={[0, Math.PI / 2, 0]} scale={[20, 0.6, 1]} />
        <Lightformer form="rect" intensity={3.5} color="#9fcbff" position={[9, 2.5, -3]} rotation={[0, -Math.PI / 2, 0]} scale={[20, 0.35, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#7fb8ff" position={[0, 3, -10]} scale={[18, 1.2, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#ffffff" position={[3, 6, 8]} scale={3} />
      </Environment>
      <Director />
      <Board texSize={cfg.boardTex} aniso={tier === 'low' ? 4 : 8} />
      <City density={cfg.cityDensity} />
      <Scheduler />
      <Analyzer />
      <Terrain />
      <Particles N={cfg.particles} cityDensity={cfg.cityDensity} />
      <Motes count={cfg.motes} />
      <Effects dof={cfg.dof && settings.dof} bloom={cfg.bloom && settings.bloom} ao={cfg.ao} />
      <Warmup />
      <AutoQuality />
    </>
  )
}

export default function Stage() {
  const [tier, setTier] = useState<Tier>(() => resolvedTier())
  const [failed, setFailed] = useState(false)

  useEffect(
    () =>
      useApp.subscribe((s, prev) => {
        if (s.settings.quality !== prev.settings.quality || s.autoTier !== prev.autoTier) setTier(resolvedTier())
      }),
    [],
  )

  useEffect(() => () => setRenderer(null), [])

  if (failed) return null
  const cfg = tiers[tier]

  return (
    <div className="stage" aria-hidden="true">
      <Canvas
        frameloop="never"
        eventSource={typeof document !== 'undefined' ? document.body : undefined}
        eventPrefix="client"
        dpr={[1, cfg.dprMax]}
        gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false, depth: true }}
        camera={{ fov: 30, near: 0.06, far: 900, position: [12, 2, 11] }}
        flat
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NoToneMapping
          setRenderer((ts) => advance(ts / 1000))
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            setFailed(true)
            useApp.getState().set({ webgl: false, ready: true })
          })
        }}
        style={{ position: 'absolute', inset: 0, touchAction: 'pan-y' }}
      >
        <Suspense fallback={null}>
          <World tier={tier} />
        </Suspense>
      </Canvas>
    </div>
  )
}

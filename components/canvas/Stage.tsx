'use client'

import { Environment, Lightformer } from '@react-three/drei'
import { Canvas, advance, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import * as THREE from 'three'
import { setRenderer } from '@/lib/loop'
import { baseDpr, stepDown, tiers } from '@/lib/quality'
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

/**
 * Akıcılık önce gelir. Kare hızı düşünce önce çizim çözünürlüğü kademeli olarak iner (dinamik çözünürlük);
 * bu da yetmezse kalite bir kademe düşer. Kare hızı uzun süre yüksek kalırsa çözünürlük geri çıkar.
 */
function AutoQuality() {
  const gl = useThree((s) => s.gl)
  const setDpr = useThree((s) => s.setDpr)
  useEffect(() => {
    const MIN = 0.6
    // ?res=1 gibi bir parametre çözünürlük ölçeğini sabitler (karşılaştırma ve ekran görüntüsü için)
    const fixed = Number(new URLSearchParams(window.location.search).get('res')) || 0
    let scale = fixed || 1
    let low = 0
    let high = 0
    let atMinLow = 0
    let warm = 0
    const apply = () => {
      const cfg = tiers[resolvedTier()]
      const dpr = Math.max(0.4, baseDpr(cfg, window.innerWidth, window.innerHeight) * scale)
      if (Math.abs(gl.getPixelRatio() - dpr) > 0.01) setDpr(dpr)
      const size = gl.getDrawingBufferSize(new THREE.Vector2())
      const r = useApp.getState().render
      if (r.w !== size.x || r.h !== size.y || r.scale !== scale) useApp.getState().set({ render: { w: size.x, h: size.y, scale } })
    }
    apply()
    const id = window.setInterval(() => {
      const app = useApp.getState()
      if (document.hidden || app.bios || !app.ready) return
      // açılıştaki ilk saniyeler (shader derleme, dokular) ölçüme katılmasın
      if (warm++ < 3 || fixed) return
      const fps = frame.fps
      if (fps < 50) {
        low++
        high = 0
      } else if (fps > 58) {
        high++
        low = 0
      } else {
        low = Math.max(0, low - 1)
        high = Math.max(0, high - 1)
      }
      if (low >= 2 && scale > MIN) {
        scale = Math.max(MIN, Math.round(scale * 0.84 * 100) / 100)
        low = 0
        apply()
      } else if (high >= 5 && scale < 1) {
        scale = Math.min(1, Math.round(scale * 1.1 * 100) / 100)
        high = 0
        apply()
      }
      // çözünürlük en altta ve hâlâ ağırsa: kaliteyi bir kademe indir
      if (app.settings.quality === 'auto' && scale <= MIN && fps < 42) atMinLow++
      else atMinLow = Math.max(0, atMinLow - 1)
      if (atMinLow >= 4) {
        const next = stepDown(app.autoTier)
        if (next !== app.autoTier) {
          app.set({ autoTier: next })
          scale = 0.8
          window.setTimeout(apply, 50)
        }
        atMinLow = 0
      }
    }, 750)
    const onResize = () => apply()
    window.addEventListener('resize', onResize)
    const unsub = useApp.subscribe((s, p) => {
      if (s.settings.quality !== p.settings.quality || s.autoTier !== p.autoTier) {
        if (s.settings.quality !== p.settings.quality) scale = 1
        window.setTimeout(apply, 50)
      }
    })
    return () => {
      window.clearInterval(id)
      window.removeEventListener('resize', onResize)
      unsub()
    }
  }, [gl, setDpr])
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
    // dokuları da şimdi yükle: dünyalar arası ilk geçişte takılma olmasın
    const seen = new Set<THREE.Texture>()
    scene.traverse((o) => {
      const mats = (o as THREE.Mesh).material
      for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
        for (const v of Object.values(m as unknown as Record<string, unknown>)) {
          if (v instanceof THREE.Texture && !seen.has(v)) seen.add(v)
        }
        const u = (m as THREE.ShaderMaterial).uniforms
        if (u) for (const x of Object.values(u)) if (x?.value instanceof THREE.Texture && !seen.has(x.value)) seen.add(x.value)
      }
    })
    seen.forEach((tex) => {
      try {
        gl.initTexture(tex)
      } catch {
        /* yoksay */
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
      <Board texSize={cfg.boardTex} aniso={tier === 'low' ? 4 : 8} lite={cfg.lite} />
      <City density={cfg.cityDensity} />
      <Scheduler />
      <Analyzer />
      <Terrain />
      <Particles N={cfg.particles} cityDensity={cfg.cityDensity} />
      <Motes count={cfg.motes} />
      <Effects dof={cfg.dof && settings.dof} bloom={cfg.bloom && settings.bloom} ao={cfg.ao} smaa={cfg.smaa} />
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

  // İlk piksel oranı: kademenin piksel bütçesine göre. Sonrasını AutoQuality yönetir.
  const [initialDpr] = useState(() => baseDpr(tiers[resolvedTier()], window.innerWidth, window.innerHeight))

  if (failed) return null

  return (
    <div className="stage" aria-hidden="true">
      <Canvas
        frameloop="never"
        eventSource={typeof document !== 'undefined' ? document.body : undefined}
        eventPrefix="client"
        dpr={initialDpr}
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

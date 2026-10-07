'use client'

import { useFrame } from '@react-three/fiber'
import { Bloom, DepthOfField, EffectComposer, N8AO, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing'
import { useRef } from 'react'
import { damp } from '@/lib/math'
import { dofState } from './Director'

interface Props {
  dof: boolean
  bloom: boolean
  ao: boolean
  smaa: boolean
}

/**
 * Sinematik son işleme: alan derinliği (makro çekim hissi), yalnızca gerçekten parlak
 * noktalara bloom, AgX ton eşleme, hafif vinyet ve film greni.
 */
export function Effects({ dof, bloom, ao, smaa }: Props) {
  const dofRef = useRef<DepthOfFieldEffect>(null)
  const focus = useRef(10)

  useFrame((_, dt) => {
    const e = dofRef.current
    if (!e) return
    focus.current = damp(focus.current, dofState.focus, 8, dt)
    e.cocMaterial.focusDistance = focus.current
    e.cocMaterial.focusRange = dofState.range
    e.bokehScale = damp(e.bokehScale, dofState.bokeh, 4, dt)
  })

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <>{ao ? <N8AO aoRadius={0.35} distanceFalloff={0.6} intensity={1.6} quality="medium" halfRes /> : null}</>
      <>{dof ? <DepthOfField ref={dofRef} focusDistance={10} focusRange={6} bokehScale={3} resolutionScale={0.5} /> : null}</>
      <>{bloom ? <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.92} luminanceSmoothing={0.22} radius={0.72} /> : null}</>
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.28} darkness={0.62} />
      <Noise premultiply={false} blendFunction={BlendFunction.OVERLAY} opacity={0.32} />
      <>{smaa ? <SMAA /> : null}</>
    </EffectComposer>
  )
}

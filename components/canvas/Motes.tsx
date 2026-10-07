'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { rng } from '@/lib/math'
import { presence } from './uniforms'

/** Kameranın etrafında süzülen ince toz: derinlik hissi verir, her dünyada ölçeğine göre büyür. */
export const motesState = { box: 6, size: 0.012, bright: 0.5 }

export function Motes({ count }: { count: number }) {
  const { points, mat } = useMemo(() => {
    const r = rng(42)
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = r()
      pos[i * 3 + 1] = r()
      pos[i * 3 + 2] = r()
      seed[i] = r()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uBox: { value: 6 },
        uSize: { value: 0.012 },
        uTime: { value: 0 },
        uScale: { value: 800 },
        uBright: { value: 0.5 },
        uColor: { value: new THREE.Color('#9fd6ff') },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uBox;
        uniform float uSize;
        uniform float uTime;
        uniform float uScale;
        varying float vA;
        void main() {
          vec3 drift = vec3(sin(uTime * 0.11 + aSeed * 40.0), cos(uTime * 0.07 + aSeed * 23.0) * 0.6 - uTime * 0.02, sin(uTime * 0.09 + aSeed * 11.0)) * 0.05;
          vec3 p = position + drift;
          vec3 w = mod(p * uBox - cameraPosition, uBox) - uBox * 0.5 + cameraPosition;
          vec4 mv = modelViewMatrix * vec4(w, 1.0);
          gl_Position = projectionMatrix * mv;
          float d = -mv.z;
          float px = uSize * uScale / max(d, 0.001);
          gl_PointSize = clamp(px, 1.0, 9.0);
          float edge = 1.0 - smoothstep(uBox * 0.3, uBox * 0.5, length(w - cameraPosition));
          vA = edge * clamp(px * px, 0.05, 1.0) * (0.3 + 0.7 * fract(aSeed * 7.13));
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uBright;
        varying float vA;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float r = dot(c, c) * 4.0;
          if (r > 1.0) discard;
          gl_FragColor = vec4(uColor * (1.0 - r) * vA * uBright, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const p = new THREE.Points(g, m)
    p.frustumCulled = false
    p.renderOrder = 15
    return { points: p, mat: m }
  }, [count])

  useFrame((state) => {
    const cam = state.camera as THREE.PerspectiveCamera
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uBox.value = motesState.box
    mat.uniforms.uSize.value = motesState.size
    mat.uniforms.uBright.value = motesState.bright * (presence.board.value + presence.city.value + presence.sched.value + presence.analyzer.value + presence.terrain.value)
    mat.uniforms.uScale.value = (state.size.height * state.viewport.dpr * 0.5) / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
  })

  return <primitive object={points} />
}

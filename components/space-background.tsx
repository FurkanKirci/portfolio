"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Stars, Environment } from "@react-three/drei"
import type * as THREE from "three"

interface SpaceBackgroundProps {
  color: string
}

function ParticleField({ color }: { color: string }) {
  const points = useRef<THREE.Points>(null)

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y += 0.0005
      points.current.rotation.x += 0.0002
    }
  })

  const particlesPosition = new Float32Array(1500 * 3)
  for (let i = 0; i < 1500; i++) {
    particlesPosition[i * 3] = (Math.random() - 0.5) * 100
    particlesPosition[i * 3 + 1] = (Math.random() - 0.5) * 100
    particlesPosition[i * 3 + 2] = (Math.random() - 0.5) * 100
  }

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.03} color={color} transparent opacity={0.6} />
    </points>
  )
}

export default function SpaceBackground({ color }: SpaceBackgroundProps) {
  return (
    <>
      <Environment preset="night" />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color={color} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ffffff" />

      <Stars radius={300} depth={60} count={3000} factor={7} saturation={0} fade />
      <ParticleField color={color} />
    </>
  )
}

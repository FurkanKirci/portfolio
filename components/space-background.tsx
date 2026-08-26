"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Stars, Environment, Float } from "@react-three/drei"
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing"
import * as THREE from "three"
import { createNebulaTexture, createPlanetMaps, createRingTexture, type PlanetType } from "@/lib/planet-textures"

interface SpaceBackgroundProps {
  color: string
  /** Which procedural planet to feature - matches the planet used for this page on the homepage. */
  planetType?: PlanetType
  /** Deterministic seed so the same page always renders the same-looking planet. */
  seed?: number
}

function ParticleField({ color }: { color: string }) {
  const points = useRef<THREE.Points>(null)

  useFrame(() => {
    if (points.current) {
      points.current.rotation.y += 0.0005
      points.current.rotation.x += 0.0002
    }
  })

  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(1500 * 3)
    for (let i = 0; i < 1500; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100
    }
    return positions
  }, [])

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
      <pointsMaterial size={0.035} color={color} transparent opacity={0.65} />
    </points>
  )
}

/** Very gentle camera sway so the scene feels alive without needing scroll input. */
function CameraDrift() {
  const { camera } = useThree()
  const base = useRef({ x: camera.position.x, y: camera.position.y })

  useFrame((state) => {
    const t = state.clock.elapsedTime
    camera.position.x = base.current.x + Math.sin(t * 0.15) * 0.35
    camera.position.y = base.current.y + Math.cos(t * 0.12) * 0.2
    camera.lookAt(0, 0, -4)
  })

  return null
}

function FeaturedPlanet({ color, planetType, seed = 17 }: { color: string; planetType: PlanetType; seed?: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)

  const { map, normalMap, cloudsMap, nightMap } = useMemo(() => createPlanetMaps(planetType, seed), [planetType, seed])
  const ringTexture = useMemo(
    () => (planetType === "jupiter" || planetType === "neptune" ? createRingTexture(color, seed) : null),
    [planetType, color, seed],
  )
  const isGasGiant = planetType === "jupiter" || planetType === "neptune"

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0035
    }
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.005
    if (atmosphereRef.current) atmosphereRef.current.rotation.y += 0.0015
    if (meshRef.current) {
      meshRef.current.position.y = -0.4 + Math.sin(state.clock.elapsedTime * 0.35) * 0.15
    }
  })

  return (
    <Float speed={1} rotationIntensity={0.1} floatIntensity={0.4}>
      <group position={[2.6, -0.6, -5.5]} rotation={[0.25, 0, 0.15]}>
        <mesh ref={atmosphereRef} scale={2.35}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.22} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>

        <mesh ref={meshRef} scale={2}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial
            map={map}
            normalMap={normalMap}
            normalScale={new THREE.Vector2(isGasGiant ? 0.4 : 1, isGasGiant ? 0.4 : 1)}
            emissiveMap={nightMap}
            emissive={nightMap ? "#ffcf7a" : color}
            emissiveIntensity={nightMap ? 0.3 : 0.12}
            roughness={isGasGiant ? 0.9 : 0.75}
            metalness={0.05}
          />
        </mesh>

        {cloudsMap && (
          <mesh ref={cloudsRef} scale={2.04}>
            <sphereGeometry args={[1, 48, 48]} />
            <meshStandardMaterial alphaMap={cloudsMap} color="#ffffff" transparent opacity={0.85} depthWrite={false} roughness={1} />
          </mesh>
        )}

        {ringTexture && (
          <mesh rotation={[Math.PI / 2 + 0.3, 0, 0]}>
            <ringGeometry args={[2.9, 4, 96]} />
            <meshBasicMaterial map={ringTexture} transparent opacity={0.65} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
      </group>
    </Float>
  )
}

function NebulaBackdrop({ color, seed = 20 }: { color: string; seed?: number }) {
  const texture = useMemo(
    () => createNebulaTexture(seed, ["#050512", color, "#0a0a1f", "#050512"]),
    [seed, color],
  )
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.00005
  })

  return (
    <group ref={groupRef}>
      <mesh scale={90}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial map={texture} transparent opacity={0.5} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

export default function SpaceBackground({ color, planetType = "earth", seed = 17 }: SpaceBackgroundProps) {
  return (
    <>
      <CameraDrift />
      <NebulaBackdrop color={color} seed={seed + 400} />

      <Environment preset="night" />
      <ambientLight intensity={0.22} />
      <hemisphereLight args={[color, "#05050f", 0.3]} />
      <pointLight position={[10, 10, 10]} intensity={1.2} color={color} />
      <pointLight position={[-10, -6, -6]} intensity={0.6} color="#ffffff" />

      <Stars radius={300} depth={60} count={4000} factor={7} saturation={0} fade speed={1} />
      <ParticleField color={color} />

      <FeaturedPlanet color={color} planetType={planetType} seed={seed} />

      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.3} intensity={0.55} mipmapBlur height={260} />
        <Vignette eskil={false} offset={0.15} darkness={0.75} />
      </EffectComposer>
    </>
  )
}

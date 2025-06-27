"use client"

import { useRef, useState, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Stars, Text, Environment, Float } from "@react-three/drei"
import { useRouter } from "next/navigation"
import * as THREE from "three"

interface SolarSystemProps {
  scrollProgress: number
  hoveredPlanet: string
}

interface PlanetProps {
  position: [number, number, number]
  colors: string[]
  size: number
  name: string
  route: string
  orbitRadius: number
  orbitSpeed: number
  planetType: "earth" | "mars" | "jupiter" | "venus" | "neptune"
  scrollProgress: number
  planetId: string
  isNearest: boolean
  distanceToCamera: number
  isHovered: boolean
}

function ZoomOutCamera({ scrollProgress }: { scrollProgress: number }) {
  const { camera } = useThree()

  useFrame(() => {
    // Smooth zoom out effect
    const baseZ = 12
    const maxZ = 100
    const targetZ = baseZ + scrollProgress * (maxZ - baseZ)

    // Smooth camera movement
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05)

    // Slight Y movement for better perspective
    const baseY = 8
    const maxY = 25
    const targetY = baseY + scrollProgress * (maxY - baseY)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05)

    // Keep X centered
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.05)

    // Always look at center
    camera.lookAt(0, 0, 0)

    // Adjust FOV for more dramatic effect (only for PerspectiveCamera)
    if ('fov' in camera) {
      const baseFOV = 75
      const maxFOV = 90
      const targetFOV = baseFOV + scrollProgress * (maxFOV - baseFOV)
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.02)
      camera.updateProjectionMatrix()
    }
  })

  return null
}

function DistantGalaxies({ scrollProgress }: { scrollProgress: number }) {
  const galaxies = useMemo(() => {
    const temp = []
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const distance = 80 + Math.random() * 40
      const x = Math.cos(angle) * distance
      const z = Math.sin(angle) * distance
      const y = (Math.random() - 0.5) * 30
      const size = 2 + Math.random() * 4
      const rotationSpeed = (Math.random() - 0.5) * 0.001
      const galaxyType = Math.floor(Math.random() * 3) // 0: spiral, 1: elliptical, 2: irregular
      const color = [
        "#8b5cf6", // Purple
        "#06b6d4", // Cyan
        "#f59e0b", // Amber
        "#ef4444", // Red
        "#10b981", // Emerald
        "#f97316", // Orange
      ][Math.floor(Math.random() * 6)]

      temp.push({
        position: [x, y, z],
        size,
        rotationSpeed,
        galaxyType,
        color,
        initialRotation: Math.random() * Math.PI * 2,
      })
    }
    return temp
  }, [])

  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0001
    }
  })

  // Only show galaxies after 43 AU (scrollProgress > 0.35)
  const galaxyOpacity = scrollProgress > 0.35 ? Math.min((scrollProgress - 0.35) / 0.3, 1) : 0

  if (galaxyOpacity === 0) return null

  return (
    <group ref={groupRef}>
      {galaxies.map((galaxy, i) => (
        <group key={i} position={galaxy.position as [number, number, number]}>
          <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.05}>
            {/* Galaxy Core */}
            <mesh
              rotation={[galaxy.initialRotation, galaxy.initialRotation * 0.7, Date.now() * galaxy.rotationSpeed]}
              scale={galaxy.size}
            >
              <sphereGeometry args={[1, 16, 16]} />
              <meshBasicMaterial color={galaxy.color} transparent opacity={galaxyOpacity * 0.8} />
            </mesh>

            {/* Galaxy Spiral Arms (for spiral galaxies) */}
            {galaxy.galaxyType === 0 && (
              <>
                <mesh rotation={[Math.PI / 2, 0, Date.now() * galaxy.rotationSpeed]} scale={galaxy.size * 1.8}>
                  <ringGeometry args={[0.8, 2.2, 32]} />
                  <meshBasicMaterial
                    color={galaxy.color}
                    transparent
                    opacity={galaxyOpacity * 0.5}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                <mesh
                  rotation={[Math.PI / 2, Math.PI / 3, Date.now() * galaxy.rotationSpeed]}
                  scale={galaxy.size * 1.5}
                >
                  <ringGeometry args={[0.6, 1.8, 32]} />
                  <meshBasicMaterial
                    color={galaxy.color}
                    transparent
                    opacity={galaxyOpacity * 0.3}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </>
            )}

            {/* Galaxy Halo */}
            <mesh scale={galaxy.size * 2.5}>
              <sphereGeometry args={[1, 12, 12]} />
              <meshBasicMaterial color={galaxy.color} transparent opacity={galaxyOpacity * 0.15} />
            </mesh>

            {/* Galaxy Label */}
            <Text
              position={[0, galaxy.size * 3, 0]}
              fontSize={galaxy.size * 0.3}
              color={galaxy.color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.01}
              outlineColor="black"
            >
              {`Galaksi ${i + 1}`}
            </Text>
          </Float>
        </group>
      ))}
    </group>
  )
}

function Planet({
  position,
  colors,
  size,
  name,
  route,
  orbitRadius,
  orbitSpeed,
  planetType,
  scrollProgress,
  planetId,
  isNearest,
  distanceToCamera,
  isHovered,
}: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  const highlightRef = useRef<THREE.Mesh>(null)
  const [localHovered, setLocalHovered] = useState(false)
  const router = useRouter()

  const handleClick = () => {
    router.push(route)
  }

  // Create planet texture based on type
  const planetTexture = useMemo(() => {
    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext("2d")!

    const gradient = ctx.createLinearGradient(0, 0, 512, 256)

    switch (planetType) {
      case "earth":
        gradient.addColorStop(0, "#1e40af")
        gradient.addColorStop(0.3, "#3b82f6")
        gradient.addColorStop(0.5, "#22c55e")
        gradient.addColorStop(0.7, "#16a34a")
        gradient.addColorStop(1, "#1e40af")
        break
      case "mars":
        gradient.addColorStop(0, "#dc2626")
        gradient.addColorStop(0.3, "#ea580c")
        gradient.addColorStop(0.5, "#f97316")
        gradient.addColorStop(0.7, "#dc2626")
        gradient.addColorStop(1, "#991b1b")
        break
      case "jupiter":
        gradient.addColorStop(0, "#7c3aed")
        gradient.addColorStop(0.2, "#a855f7")
        gradient.addColorStop(0.4, "#ec4899")
        gradient.addColorStop(0.6, "#8b5cf6")
        gradient.addColorStop(0.8, "#6366f1")
        gradient.addColorStop(1, "#7c3aed")
        break
      case "venus":
        gradient.addColorStop(0, "#f59e0b")
        gradient.addColorStop(0.3, "#fbbf24")
        gradient.addColorStop(0.5, "#f97316")
        gradient.addColorStop(0.7, "#ea580c")
        gradient.addColorStop(1, "#d97706")
        break
      case "neptune":
        gradient.addColorStop(0, "#10b981")
        gradient.addColorStop(0.3, "#059669")
        gradient.addColorStop(0.5, "#047857")
        gradient.addColorStop(0.7, "#065f46")
        gradient.addColorStop(1, "#064e3b")
        break
    }

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 256)

    // Add surface details
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * 512
      const y = Math.random() * 256
      const radius = Math.random() * 2
      const alpha = Math.random() * 0.4

      ctx.globalAlpha = alpha
      ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000"
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    if (planetType === "jupiter") {
      ctx.globalAlpha = 0.3
      for (let i = 0; i < 6; i++) {
        const y = (i / 6) * 256
        ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#000000"
        ctx.fillRect(0, y, 512, 40)
      }
    }

    return new THREE.CanvasTexture(canvas)
  }, [planetType])

  useFrame((state) => {
    if (groupRef.current) {
      // Slower orbit as we zoom out
      const adjustedSpeed = orbitSpeed * (1 - scrollProgress * 0.5)
      groupRef.current.rotation.y += adjustedSpeed
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.015 // 0.008'den artırıldı
      meshRef.current.rotation.x += 0.005 // 0.002'den artırıldı
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += 0.008 // 0.004'ten artırıldı
    }

    // Highlight animation for nearest planet
    if (highlightRef.current && isNearest) {
      const pulseIntensity = Math.sin(state.clock.elapsedTime * 2) * 0.3 + 0.7
      highlightRef.current.scale.setScalar(pulseIntensity)
    }
  })

  const handlePointerOver = (event: any) => {
    event.stopPropagation()
    setLocalHovered(true)
    document.body.style.cursor = "pointer"
  }

  const handlePointerOut = (event: any) => {
    event.stopPropagation()
    setLocalHovered(false)
    document.body.style.cursor = "auto"
  }

  // Scale based on zoom level
  const zoomScale = 1 + scrollProgress * 0.5

  // Enhanced effects for nearest planet and button hover
  const isHighlighted = isNearest || isHovered || localHovered
  const highlightScale = isHovered ? 1.4 : isNearest ? 1.1 : localHovered ? 1.2 : 1
  const highlightGlow = isHovered ? 0.8 : isNearest ? 0.4 : localHovered ? 0.6 : 0.15
  const highlightAtmosphere = isHovered ? 0.6 : isNearest ? 0.35 : localHovered ? 0.5 : 0.18

  return (
    <group ref={groupRef}>
      <group position={[orbitRadius, 0, 0]}>
        <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.08}>
          {/* Nearest Planet Highlight Ring */}
          {isHighlighted && (
            <mesh ref={highlightRef} position={position} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry
                args={[size * 2.2 * zoomScale * highlightScale, size * 2.8 * zoomScale * highlightScale, 32]}
              />
              <meshBasicMaterial color="#ffffff" transparent opacity={isHovered ? 0.9 : 0.6} side={THREE.DoubleSide} />
            </mesh>
          )}

          {/* Planet Atmosphere */}
          <mesh ref={atmosphereRef} position={position} scale={size * 1.5 * zoomScale * highlightScale}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial color={colors[0]} transparent opacity={highlightAtmosphere} side={THREE.BackSide} />
          </mesh>

          {/* Main Planet - Increased base size */}
          <mesh ref={meshRef} position={position} scale={size * 1.3 * zoomScale * highlightScale}>
            <sphereGeometry args={[1, 64, 64]} />
            <meshStandardMaterial
              map={planetTexture}
              roughness={0.6}
              metalness={0.2}
              emissive={colors[0]}
              emissiveIntensity={highlightGlow}
            />
          </mesh>

          {/* Invisible Larger Click Area */}
          <mesh
            position={position}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onPointerMove={handlePointerOver}
            scale={size * 2.2 * zoomScale}
            visible={false}
          >
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>

          {/* Planet Label - Enhanced for highlighted */}
          <Text
            position={[0, 3.5 * zoomScale * highlightScale, 0]}
            fontSize={0.5 * zoomScale * (isHighlighted ? 1.3 : 1)}
            color={isHighlighted ? "#ffffff" : "white"}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="black"
          >
            {name}
          </Text>

          {/* Distance Indicator for nearest planet */}
          {isNearest && scrollProgress > 0.2 && (
            <Text
              position={[0, 2.5 * zoomScale, 0]}
              fontSize={0.3 * zoomScale}
              color="#00ff88"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.01}
              outlineColor="black"
            >
              {`${distanceToCamera.toFixed(1)} AU`}
            </Text>
          )}

          {/* Planet Rings */}
          {planetType === "jupiter" && (
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} scale={zoomScale * highlightScale}>
              <ringGeometry args={[1.8, 2.4, 64]} />
              <meshBasicMaterial
                color={colors[1]}
                transparent
                opacity={isHighlighted ? 0.8 : 0.4}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {/* Planet Glow - Enhanced for highlighted */}
          <mesh
            position={[0, 0, 0]}
            scale={2.5 * zoomScale * highlightScale}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial
              color={isHighlighted ? "#ffffff" : colors[0]}
              transparent
              opacity={isHighlighted ? 0.4 : 0.15}
            />
          </mesh>
        </Float>

        {/* Orbit Ring - Enhanced for highlighted */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[orbitRadius - 0.05, orbitRadius + 0.05, 128]} />
          <meshBasicMaterial
            color={isHighlighted ? "#ffffff" : colors[0]}
            transparent
            opacity={isHighlighted ? 0.8 : 0.25 + scrollProgress * 0.2}
          />
        </mesh>
      </group>
    </group>
  )
}

function Sun({ scrollProgress, isHovered }: { scrollProgress: number; isHovered: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const coronaRef = useRef<THREE.Mesh>(null)
  const [localHovered, setLocalHovered] = useState(false)

  const sunTexture = useMemo(() => {
    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext("2d")!

    const gradient = ctx.createRadialGradient(256, 128, 0, 256, 128, 256)
    gradient.addColorStop(0, "#ffff44") // Daha sarı
    gradient.addColorStop(0.3, "#ffdd00") // Daha sarı
    gradient.addColorStop(0.6, "#ffaa00") // Daha sarı turuncu
    gradient.addColorStop(1, "#ff6600") // Turuncu

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 256)

    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 512
      const y = Math.random() * 256
      const radius = Math.random() * 4
      const alpha = Math.random() * 0.6

      ctx.globalAlpha = alpha
      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    return new THREE.CanvasTexture(canvas)
  }, [])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.004
      meshRef.current.rotation.x += 0.001
    }
    if (coronaRef.current) {
      coronaRef.current.rotation.y -= 0.002
      coronaRef.current.rotation.z += 0.0005
    }
  })

  const handlePointerOver = () => {
    setLocalHovered(true)
    document.body.style.cursor = "pointer"
  }

  const handlePointerOut = () => {
    setLocalHovered(false)
    document.body.style.cursor = "auto"
  }

  const zoomScale = 1 + scrollProgress * 0.8
  const planetsOpacity = scrollProgress > 0 ? Math.min(scrollProgress * 3, 1) : 0

  const isHighlighted = isHovered || localHovered
  const highlightScale = isHovered ? 1.3 : localHovered ? 1.2 : 1
  const highlightIntensity = isHovered ? 2.0 : localHovered ? 1.8 : 1.2

  return (
    <Float speed={0.6} rotationIntensity={0.08} floatIntensity={0.03}>
      {/* Sun Corona - Increased size */}
      <mesh ref={coronaRef} position={[0, 0, 0]} scale={4.0 * zoomScale * highlightScale}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={(isHighlighted ? 0.4 : 0.25) * planetsOpacity} />
      </mesh>

      {/* Main Sun - Increased size */}
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        scale={2.8 * zoomScale * highlightScale}
      >
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={sunTexture}
          emissive="#FFD700" // Daha sarı altın rengi
          emissiveIntensity={highlightIntensity * planetsOpacity}
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={planetsOpacity}
        />
      </mesh>

      {/* Sun Label */}
      <Text
        position={[0, 5.0 * zoomScale * highlightScale, 0]}
        fontSize={0.8 * zoomScale * (isHighlighted ? 1.2 : 1)}
        color="#FFD700" // Daha sarı
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="black"
        fillOpacity={planetsOpacity}
      >
        ANA SAYFA
      </Text>
    </Float>
  )
}

function EnhancedAsteroidBelt({ scrollProgress }: { scrollProgress: number }) {
  const asteroids = useMemo(() => {
    const temp = []
    for (let i = 0; i < 120; i++) {
      const radius = 28.0 + Math.random() * 3.0 // 18.5'ten artırıldı
      const angle = (i / 120) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = (Math.random() - 0.5) * 0.6
      const size = 0.02 + Math.random() * 0.04
      temp.push({ position: [x, y, z], size })
    }
    return temp
  }, [])

  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      const adjustedSpeed = 0.0006 * (1 - scrollProgress * 0.3)
      groupRef.current.rotation.y += adjustedSpeed
    }
  })

  const zoomScale = 1 + scrollProgress * 0.3

  return (
    <group ref={groupRef}>
      {asteroids.map((asteroid, i) => (
        <mesh key={i} position={asteroid.position as [number, number, number]} scale={asteroid.size * zoomScale}>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial
            color="#8B7355"
            roughness={0.9}
            metalness={0.2}
            emissive="#3a3a3a"
            emissiveIntensity={0.08}
          />
        </mesh>
      ))}
    </group>
  )
}

function ZoomedParticleField({ scrollProgress }: { scrollProgress: number }) {
  const points = useRef<THREE.Points>(null)

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y += 0.00008
      points.current.rotation.x += 0.00003
    }
  })

  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(4000 * 3)
    for (let i = 0; i < 4000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200
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
      <pointsMaterial
        size={0.03 + scrollProgress * 0.04}
        color="#ffffff"
        transparent
        opacity={0.5 + scrollProgress * 0.4}
      />
    </points>
  )
}

export default function SolarSystem({ scrollProgress, hoveredPlanet }: SolarSystemProps) {
  const { camera } = useThree()
  const [nearestPlanet, setNearestPlanet] = useState<string>("")
  const [planetDistances, setPlanetDistances] = useState<Record<string, number>>({})

  // Planet data
  const planets = [
    {
      id: "hakkimda",
      orbitRadius: 12.0, // 8.5'ten artırıldı
      colors: ["#4f46e5", "#3b82f6"],
      size: 1.0,
      name: "HAKKIMDA",
      route: "/hakkimda",
      orbitSpeed: 0.004,
      planetType: "earth" as const,
    },
    {
      id: "yetenekler",
      orbitRadius: 16.5, // 11.5'ten artırıldı
      colors: ["#06b6d4", "#0891b2"],
      size: 1.1,
      name: "YETENEKLER",
      route: "/yetenekler",
      orbitSpeed: 0.003,
      planetType: "mars" as const,
    },
    {
      id: "deneyim",
      orbitRadius: 21.0, // 14.5'ten artırıldı
      colors: ["#8b5cf6", "#a855f7"],
      size: 0.9,
      name: "DENEYİM",
      route: "/deneyim",
      orbitSpeed: 0.002,
      planetType: "jupiter" as const,
    },
    {
      id: "projelerim",
      orbitRadius: 31.0, // 14.5'ten artırıldı
      colors: ["#10b981", "#059669"],
      size: 0.9,
      name: "PROJELERİM",
      route: "/projelerim",
      orbitSpeed: 0.0018,
      planetType: "neptune" as const,
    },
    {
      id: "iletisim",
      orbitRadius: 25.5, // 17.5'ten artırıldı
      colors: ["#f59e0b", "#fbbf24"],
      size: 0.8,
      name: "İLETİŞİM",
      route: "/iletisim",
      orbitSpeed: 0.0015,
      planetType: "venus" as const,
    },
  ]

  useFrame((state) => {
    // Calculate distances to camera for each planet
    const distances: Record<string, number> = {}
    let closestDistance = Number.POSITIVE_INFINITY
    let closestPlanet = ""

    planets.forEach((planet) => {
      // Calculate current planet position based on orbit
      const angle = state.clock.elapsedTime * planet.orbitSpeed
      const planetX = Math.cos(angle) * planet.orbitRadius
      const planetZ = Math.sin(angle) * planet.orbitRadius
      const planetY = 0

      // Calculate distance to camera
      const distance = Math.sqrt(
        Math.pow(camera.position.x - planetX, 2) +
        Math.pow(camera.position.y - planetY, 2) +
        Math.pow(camera.position.z - planetZ, 2),
      )

      distances[planet.id] = distance

      if (distance < closestDistance) {
        closestDistance = distance
        closestPlanet = planet.id
      }
    })

    setPlanetDistances(distances)
    setNearestPlanet(closestPlanet)
  })

  // Gezegenler için opacity kontrolü - scroll başladığında belirsin
  const planetsOpacity = scrollProgress > 0 ? Math.min(scrollProgress * 3, 1) : 0

  return (
    <>
      <ZoomOutCamera scrollProgress={scrollProgress} />

      <Environment preset="night" />
      <ambientLight intensity={0.2 + scrollProgress * 0.15} />
      <pointLight position={[0, 0, 0]} intensity={6 + scrollProgress * 3} color="#FDB813" />
      <pointLight position={[25, 20, 25]} intensity={1.2 + scrollProgress * 0.6} color="#4f46e5" />
      <pointLight position={[-25, 20, -25]} intensity={1.0 + scrollProgress * 0.6} color="#06b6d4" />

      <Stars radius={300 + scrollProgress * 200} depth={150} count={8000} factor={12} saturation={0} fade />
      <ZoomedParticleField scrollProgress={scrollProgress} />

      {/* Sadece scroll başladığında göster */}
      {planetsOpacity > 0 && (
        <>
          <EnhancedAsteroidBelt scrollProgress={scrollProgress} />

          {/* Distant Galaxies - Appear after 43 AU */}
          <DistantGalaxies scrollProgress={scrollProgress} />

          {/* Sun */}
          <Sun scrollProgress={scrollProgress} isHovered={hoveredPlanet === "sun"} />

          {/* Planets with nearest highlighting and button hover */}
          {planets.map((planet) => (
            <Planet
              key={planet.id}
              position={[0, 0, 0]}
              colors={planet.colors}
              size={planet.size}
              name={planet.name}
              route={planet.route}
              orbitRadius={planet.orbitRadius}
              orbitSpeed={planet.orbitSpeed}
              planetType={planet.planetType}
              scrollProgress={scrollProgress}
              planetId={planet.id}
              isNearest={nearestPlanet === planet.id}
              distanceToCamera={planetDistances[planet.id] || 0}
              isHovered={hoveredPlanet === planet.id}
            />
          ))}
        </>
      )}
    </>
  )
}

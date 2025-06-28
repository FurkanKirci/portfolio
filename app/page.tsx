"use client"

import { Suspense, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import Navigation from "@/components/navigation"
import LoadingScreen from "@/components/loading-screen"

// Dynamically import 3D components with no SSR
const SolarSystem = dynamic(() => import("@/components/solar-system"), {
  ssr: false,
})

const Canvas = dynamic(() => import("@react-three/fiber").then((mod) => mod.Canvas), {
  ssr: false,
})

export default function Home() {
  const [scrollY, setScrollY] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [hoveredPlanet, setHoveredPlanet] = useState<string>("")
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const progress = Math.min(currentScrollY / maxScroll, 1)
      setScrollY(currentScrollY)
      setScrollProgress(progress)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Calculate current distance in AU
  const currentDistance = 12 + scrollProgress * 88

  // Show navigation buttons between 28-43 AU
  const showNavigationButtons = currentDistance >= 24 && currentDistance <= 100

  const navigationButtons = [
    {
      id: "sun",
      name: "Ana Sayfa",
      route: "/",
      color: "#FDB813",
      bgColor: "from-yellow-500 to-orange-500",
      borderColor: "border-yellow-500/30",
      hoverColor: "hover:border-yellow-500/60",
    },
    {
      id: "hakkimda",
      name: "Hakkımda",
      route: "/hakkimda",
      color: "#4f46e5",
      bgColor: "from-blue-500 to-indigo-500",
      borderColor: "border-blue-500/30",
      hoverColor: "hover:border-blue-500/60",
    },
    {
      id: "yetenekler",
      name: "Yetenekler",
      route: "/yetenekler",
      color: "#06b6d4",
      bgColor: "from-cyan-500 to-blue-500",
      borderColor: "border-cyan-500/30",
      hoverColor: "hover:border-cyan-500/60",
    },
    {
      id: "deneyim",
      name: "Deneyim",
      route: "/deneyim",
      color: "#8b5cf6",
      bgColor: "from-purple-500 to-violet-500",
      borderColor: "border-purple-500/30",
      hoverColor: "hover:border-purple-500/60",
    },
    {
      id: "projelerim",
      name: "Projelerim",
      route: "/projelerim",
      color: "#10b981",
      bgColor: "from-emerald-500 to-green-500",
      borderColor: "border-emerald-500/30",
      hoverColor: "hover:border-emerald-500/60",
    },
    {
      id: "iletisim",
      name: "İletişim",
      route: "/iletisim",
      color: "#f59e0b",
      bgColor: "from-amber-500 to-orange-500",
      borderColor: "border-amber-500/30",
      hoverColor: "hover:border-amber-500/60",
    },
  ]

  return (
    <div className="relative bg-black text-white">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section with Text */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        <motion.div
          className="text-center z-10"
          style={{
            opacity: Math.max(0, 1 - scrollY / 400),
            transform: `translateY(${scrollY * 0.3}px)`,
          }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-6"
          >
            MUHAMMED FURKAN KIRCI
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="text-xl md:text-3xl text-gray-300 mb-8"
          >
            Bilgisayar Mühendisi • Fullstack Developer
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.1 }}
            className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-8 leading-relaxed"
          >
            Temiz kod, SOLID prensipleri ve Agile metodolojilerine bağlı kalarak projelere değer katmayı amaçlayan bir
            mühendisim.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="space-y-4"
          >
            <p className="text-lg text-gray-400">Portfolyomu keşfedin</p>
            <div className="animate-bounce">
              <p className="text-sm text-gray-500">🪐 Aşağı kaydırarak uzaklaşın</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.7 }}
            className="flex flex-wrap justify-center gap-4 mt-8"
          >
            <span className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-sm md:text-base">
              React & Next.js
            </span>
            <span className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-sm md:text-base">
              Node.js & Java
            </span>
            <span className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-cyan-300 text-sm md:text-base">
              MongoDB & SQL
            </span>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          style={{ opacity: Math.max(0, 1 - scrollY / 200) }}
        >
          <div className="flex flex-col items-center space-y-2">
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
            </div>
            <p className="text-xs text-gray-500">Uzaklaş</p>
          </div>
        </motion.div>
      </section>

      {/* Zoom Out Solar System Section */}
      <section className="relative min-h-[300vh]">
        {/* Fixed 3D Solar System Background with Zoom Out Effect */}
        {isClient && (
          <div className="fixed inset-0 z-0">
            <Canvas camera={{ position: [0, 8, 12], fov: 75 }}>
              <Suspense fallback={null}>
                <SolarSystem scrollProgress={scrollProgress} hoveredPlanet={hoveredPlanet} />
              </Suspense>
            </Canvas>
          </div>
        )}

        {/* Scroll Progress Indicator */}
        <div className="fixed top-1/2 right-8 z-20 transform -translate-y-1/2">
          <motion.div
            className="w-1 h-32 bg-gray-800 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: scrollProgress > 0.1 ? 0.7 : 0 }}
          >
            <motion.div
              className="w-full bg-gradient-to-t from-yellow-400 to-orange-500 rounded-full"
              style={{ height: `${scrollProgress * 100}%` }}
            />
          </motion.div>
          <p className="text-xs text-gray-500 mt-2 text-center">Zoom</p>
        </div>

        {/* Combined Navigation & Distance - Left Bottom */}
        {showNavigationButtons && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.5 }}
            className="fixed bottom-4 left-4 z-20 max-w-sm sm:max-w-md md:max-w-lg"
          >
            {/* Distance Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-3 p-3 bg-black/60 backdrop-blur-sm border border-gray-700/50 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Mesafe</p>
                  <p className="text-lg font-bold text-yellow-400">{Math.round(currentDistance)} AU</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Navigasyon Kontrolleri</p>
                  <p className="text-xs text-gray-500">Optimal Zone: 28-43 AU</p>
                </div>
              </div>
            </motion.div>

            {/* Navigation Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {navigationButtons.map((button, index) => (
                <motion.button
                  key={button.name}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push(button.route)}
                  onMouseEnter={() => setHoveredPlanet(button.id)}
                  onMouseLeave={() => setHoveredPlanet("")}
                  className={`
            relative px-2 py-2 sm:px-3 sm:py-3 rounded-lg border backdrop-blur-sm
            bg-gradient-to-r ${button.bgColor} bg-opacity-20
            ${button.borderColor} ${button.hoverColor}
            transition-all duration-300 group
            hover:shadow-lg w-full
          `}
                  style={{
                    boxShadow:
                      hoveredPlanet === button.id
                        ? `0 0 20px ${button.color}40, 0 0 40px ${button.color}20`
                        : `0 0 10px ${button.color}15`,
                  }}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <div
                      className="w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: button.color,
                        boxShadow:
                          hoveredPlanet === button.id ? `0 0 10px ${button.color}` : `0 0 5px ${button.color}60`,
                        transform: hoveredPlanet === button.id ? "scale(1.3)" : "scale(1)",
                      }}
                    />
                    <span className="text-white font-medium text-xs sm:text-sm group-hover:text-white transition-colors text-center leading-tight">
                      {button.name}
                    </span>
                  </div>

                  {/* Enhanced Hover glow effect */}
                  <div
                    className={`absolute inset-0 rounded-lg transition-opacity duration-300 ${
                      hoveredPlanet === button.id ? "opacity-20" : "opacity-0"
                    }`}
                    style={{
                      background: `radial-gradient(circle, ${button.color}40 0%, transparent 70%)`,
                    }}
                  />
                </motion.button>
              ))}
            </div>

            {/* Status Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-3 p-2 bg-black/40 backdrop-blur-sm border border-gray-700/30 rounded-lg text-center"
            >
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-xs text-gray-400">Navigation Active</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Empty content area for scroll space */}
        <div className="relative z-10 min-h-[300vh]"></div>
      </section>

      {/* Loading Screen */}
      <Suspense fallback={<LoadingScreen />}>
        <div />
      </Suspense>
    </div>
  )
}

"use client"

import { Canvas } from "@react-three/fiber"
import { Suspense } from "react"
import { motion } from "framer-motion"
import { User, MapPin, Mail, Phone, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Navigation from "@/components/navigation"
import SpaceBackground from "@/components/space-background"

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      {/* 3D Background */}
      <div className="fixed inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
          <Suspense fallback={null}>
            <SpaceBackground color="#4f46e5" />
          </Suspense>
        </Canvas>
      </div>

      {/* Navigation */}
      <Navigation />

      {/* Content */}
      <div className="relative z-10 pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* Back Button */}
          <Link href="/">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center space-x-2 mb-8 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-300 hover:bg-blue-500/30 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Güneş Sistemine Dön</span>
            </motion.div>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
                Hakkımda
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <User className="w-6 h-6 text-blue-400" />
                  <h2 className="text-3xl font-semibold text-white">Muhammed Furkan Kırcı</h2>
                </div>

                <p className="text-gray-300 leading-relaxed text-lg">
                  Temiz kod, SOLID prensipleri ve Agile metodolojilerine bağlı kalarak projelere değer katmayı amaçlayan
                  bir mühendisim. Ön yüz geliştirme için React ve Next.js teknolojilerine hakimim. Arka uç geliştirme
                  için ise Node.js, Java ve C# dillerinde tecrübeliyim.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-cyan-400" />
                    <span className="text-gray-300">furkankirci12@gmail.com</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">+90 505 974 40 10</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-red-400" />
                    <span className="text-gray-300">İstanbul, Türkiye</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="space-y-6"
              >
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm">
                  <h3 className="text-xl font-semibold text-white mb-4">Diller</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Türkçe</span>
                      <span className="text-blue-400 font-semibold">Ana Dil</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">İngilizce</span>
                      <span className="text-purple-400 font-semibold">B1</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6 backdrop-blur-sm">
                  <h3 className="text-xl font-semibold text-white mb-4">İkamet Adreslerim</h3>
                  <div className="space-y-2 text-gray-300">
                    <div>• İstanbul/Avcılar</div>
                    <div>• İstanbul/Beşiktaş</div>
                    <div>• Konya/Selçuklu</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6 backdrop-blur-sm">
                  <h3 className="text-xl font-semibold text-white mb-4">Eğitim</h3>
                  <div className="text-gray-300">
                    <p className="font-semibold text-white">Bilgisayar Mühendisliği • İngilizce Hazırlık</p>
                    <p className="text-sm">Necmettin Erbakan Üniversitesi</p>
                    <p className="text-sm text-purple-400">2019-2024 • AGNO: 3.28</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

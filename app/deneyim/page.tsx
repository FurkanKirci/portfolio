"use client"

import { Canvas } from "@react-three/fiber"
import { Suspense } from "react"
import { motion } from "framer-motion"
import { Calendar, MapPin, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Navigation from "@/components/navigation"
import SpaceBackground from "@/components/space-background"

const experiences = [
  {
    title: "Fullstack Web Developer",
    company: "Rheinland Privatschule",
    period: "2024 Ekim - Devam Ediyor",
    location: "Almanya, Düsseldorf",
    type: "Jr. Fullstack Developer",
    achievements: [
      "Java/JSP/HTML projelerinde %80 performans artışı",
      "Next.js'e geçiş ile SEO ve REST API entegrasyonu",
      "SSH & Plesk ile IONOS sunucu yönetimi",
      "ERP Uygulamalarında yeni modüller geliştirme ve Geliştirme Süreçlerini iyileştirme",
    ],
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Fullstack Developer",
    company: "Pengona Yazılım Çözümleri",
    period: "2024 Haziran - 2024 Ekim",
    location: "Türkiye, Konya",
    type: "Jr. Fullstack Developer",
    achievements: [
      "Next.js, Node.js, MongoDB ile dinamik web projeleri geliştirme",
      "Redux & Context ile durum yönetimi, responsive tasarım optimizasyonu",
      "AWS ile E-Ticaret Sistemleri geliştirme ve Entegrasyonu",
      "Sayfa yüklenme süresini 2 kata kadar iyileştirme",
    ],
    color: "from-purple-500 to-pink-500",
  },
  {
    title: "Bilgisayar Mühendisi",
    company: "Aselsan Konya Silah Sistemleri A.Ş.",
    period: "2023-2024",
    location: "Konya",
    type: "Tam Zamanlı",
    achievements: [
      "C#, .NET, SQL ile kurum içi uygulama geliştirme",
      "React, Node.js & MongoDB ile ERP'ye 4 yeni modül ekleme",
      "Kullanıcı deneyimi iyileştirme ve geliştirme",
      "PM2 ile deployment, teknik dokümantasyon hazırlama",
    ],
    color: "from-green-500 to-emerald-500",
  },
]

export default function ExperiencePage() {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      {/* 3D Background */}
      <div className="fixed inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
          <Suspense fallback={null}>
            <SpaceBackground color="#8b5cf6" />
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
              className="inline-flex items-center space-x-2 mb-8 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-colors cursor-pointer"
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
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                İş Deneyimi
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto"></div>
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-400 via-pink-400 to-blue-400"></div>

              {experiences.map((exp, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  whileHover={{ scale: 1.02 }}
                  className="relative mb-12 ml-16"
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-20 top-6 w-4 h-4 rounded-full bg-gradient-to-r ${exp.color} border-4 border-gray-900`}
                  ></div>

                  <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
                    <div className="flex flex-wrap items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{exp.title}</h3>
                        <p
                          className={`text-lg font-semibold bg-gradient-to-r ${exp.color} bg-clip-text text-transparent`}
                        >
                          {exp.company}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">{exp.type}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-300">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{exp.period}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{exp.location}</span>
                      </div>
                    </div>

                    <ul className="space-y-2">
                      {exp.achievements.map((achievement, achIndex) => (
                        <motion.li
                          key={achIndex}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.2 + achIndex * 0.1 }}
                          className="flex items-start space-x-2 text-gray-300"
                        >
                          <div
                            className={`w-2 h-2 rounded-full bg-gradient-to-r ${exp.color} mt-2 flex-shrink-0`}
                          ></div>
                          <span>{achievement}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

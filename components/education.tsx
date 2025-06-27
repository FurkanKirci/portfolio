"use client"

import { motion } from "framer-motion"
import { GraduationCap, Calendar, Award } from "lucide-react"

export default function Education() {
  return (
    <section id="education" className="min-h-screen flex items-center py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-4">
              Eğitim
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-orange-400 mx-auto"></div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 rounded-xl p-8 backdrop-blur-sm"
          >
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-4 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Bilgisayar Mühendisliği</h3>
                <p className="text-lg text-gray-300">İngilizce Hazırlık</p>
                <p className="text-orange-400 font-semibold">Necmettin Erbakan Üniversitesi</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-gray-300">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <span>2019 - 2024</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <Award className="w-5 h-5 text-green-400" />
                  <span>AGNO: 3.28</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-white mb-3">Referanslar</h4>
                <div className="space-y-2 text-sm">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-white font-medium">Doç. Dr. Hüseyin HAKLI</p>
                    <p className="text-gray-400">Doktor Öğretim Üyesi</p>
                    <p className="text-blue-400">huseyinhakli@gmail.com</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-white font-medium">Mehmet ATMACA</p>
                    <p className="text-gray-400">Lider Mühendis (Aselsan Konya)</p>
                    <p className="text-green-400">+90 543 352 42 56</p>
                    <p className="text-blue-400">atmacausa@gmail.com</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

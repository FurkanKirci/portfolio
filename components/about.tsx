"use client"

import { motion } from "framer-motion"
import { User, MapPin, Mail, Phone } from "lucide-react"

export default function About() {
  return (
    <section id="about" className="min-h-screen flex items-center py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
              Hakkımda
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <User className="w-6 h-6 text-blue-400" />
                <h3 className="text-2xl font-semibold text-white">Muhammed Furkan Kırcı</h3>
              </div>

              <p className="text-gray-300 leading-relaxed text-lg">
                Ön yüz geliştirme için React ve Next.js teknolojilerine hakimim. Arka uç geliştirme için ise Node.js
                (JavaScript), Java ve C# dillerinde tecrübeliyim.
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
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
                <h4 className="text-xl font-semibold text-white mb-4">Diller</h4>
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

              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6">
                <h4 className="text-xl font-semibold text-white mb-4">İkamet Geçmişi</h4>
                <div className="space-y-2 text-gray-300">
                  <div>• İstanbul/Avcılar</div>
                  <div>• İstanbul/Beşiktaş</div>
                  <div>• Konya/Selçuklu</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

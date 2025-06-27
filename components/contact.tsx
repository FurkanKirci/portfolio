"use client"

import { motion } from "framer-motion"
import { Mail, Phone, MapPin, Github, Linkedin, Send } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Contact() {
  return (
    <section id="contact" className="min-h-screen flex items-center py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
              İletişim
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-pink-400 to-purple-400 mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-2xl font-bold text-white mb-6">Benimle İletişime Geçin</h3>
                <p className="text-gray-300 leading-relaxed">
                  Yeni projeler, iş fırsatları veya işbirliği önerileri için benimle iletişime geçmekten çekinmeyin.
                </p>
              </div>

              <div className="space-y-4">
                <motion.a
                  href="mailto:furkankirci12@gmail.com"
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg hover:border-blue-500/40 transition-colors"
                >
                  <Mail className="w-6 h-6 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">Email</p>
                    <p className="text-gray-300">furkankirci12@gmail.com</p>
                  </div>
                </motion.a>

                <motion.a
                  href="tel:+905059744010"
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg hover:border-green-500/40 transition-colors"
                >
                  <Phone className="w-6 h-6 text-green-400" />
                  <div>
                    <p className="text-white font-medium">Telefon</p>
                    <p className="text-gray-300">+90 505 974 40 10</p>
                  </div>
                </motion.a>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center space-x-4 p-4 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-lg"
                >
                  <MapPin className="w-6 h-6 text-red-400" />
                  <div>
                    <p className="text-white font-medium">Konum</p>
                    <p className="text-gray-300">İstanbul, Türkiye</p>
                  </div>
                </motion.div>
              </div>

              <div className="flex space-x-4">
                <motion.a
                  href="https://github.com/FurkanKirci"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  className="p-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
                >
                  <Github className="w-6 h-6 text-white" />
                </motion.a>
                <motion.a
                  href="https://linkedin.com/in/furkankirci"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  className="p-3 bg-blue-600 border border-blue-500 rounded-lg hover:border-blue-400 transition-colors"
                >
                  <Linkedin className="w-6 h-6 text-white" />
                </motion.a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 rounded-xl p-8 backdrop-blur-sm"
            >
              <h3 className="text-xl font-bold text-white mb-6">Mesaj Gönder</h3>
              <form className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Adınız"
                    className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email Adresiniz"
                    className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <textarea
                    rows={4}
                    placeholder="Mesajınız"
                    className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
                  ></textarea>
                </div>
                <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-3">
                  <Send className="w-4 h-4 mr-2" />
                  Mesaj Gönder
                </Button>
              </form>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

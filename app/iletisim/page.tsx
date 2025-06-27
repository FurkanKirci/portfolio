"use client"

import { Canvas } from "@react-three/fiber"
import { Suspense, useState } from "react"
import { motion } from "framer-motion"
import { Mail, Phone, MapPin, Github, Linkedin, Send, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/navigation"
import SpaceBackground from "@/components/space-background"
import { sendContactEmail } from "@/app/actions/send-email"

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const result = await sendContactEmail(formData)
      setSubmitStatus(result)
      
      if (result.success) {
        // Form'u temizle
        const form = document.querySelector('form') as HTMLFormElement
        form?.reset()
      }
    } catch (error) {
      setSubmitStatus({ success: false, message: "Bir hata oluştu." })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      {/* 3D Background */}
      <div className="fixed inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
          <Suspense fallback={null}>
            <SpaceBackground color="#f59e0b" />
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
              className="inline-flex items-center space-x-2 mb-8 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-300 hover:bg-yellow-500/30 transition-colors cursor-pointer"
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
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-4">
                İletişim
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-orange-400 mx-auto"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Benimle İletişime Geçin</h2>
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
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 rounded-xl p-8 backdrop-blur-sm"
              >
                <h3 className="text-xl font-bold text-white mb-6">Mesaj Gönder</h3>
                
                {/* Status Message */}
                {submitStatus && (
                  <div className={`mb-4 p-3 rounded-lg ${
                    submitStatus.success 
                      ? "bg-green-500/20 border border-green-500/30 text-green-300" 
                      : "bg-red-500/20 border border-red-500/30 text-red-300"
                  }`}>
                    {submitStatus.message}
                  </div>
                )}

                <form action={handleSubmit} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      name="name"
                      placeholder="Adınız"
                      required
                      className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      name="email"
                      placeholder="Email Adresiniz"
                      required
                      className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <textarea
                      name="message"
                      rows={4}
                      placeholder="Mesajınız"
                      required
                      className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:outline-none resize-none"
                    ></textarea>
                  </div>
                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Mesaj Gönder
                      </>
                    )}
                  </Button>
                </form>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

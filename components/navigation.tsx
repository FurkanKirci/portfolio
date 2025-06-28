"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { name: "Ana Sayfa", href: "/", icon: "🌟" },
  { name: "Hakkımda", href: "/hakkimda", icon: "🪐" },
  { name: "Yetenekler", href: "/yetenekler", icon: "🌍" },
  { name: "Deneyim", href: "/deneyim", icon: "🌑" },
  { name: "Projelerim", href: "/projelerim", icon: "🚀" },
  { name: "İletişim", href: "/iletisim", icon: "🌙" },
]

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-black/80 backdrop-blur-md border-b border-gray-800" : "bg-black/50 backdrop-blur-sm"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent cursor-pointer"
            >
              MFK ⭐
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-6">
            {navItems.map((item) => (
              <Link key={item.name} href={item.href}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    pathname === item.href
                      ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-white"
                      : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </motion.div>
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-white">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-black/90 backdrop-blur-md border-t border-gray-800"
          >
            <div className="py-4 space-y-2">
              {navItems.map((item) => (
                <Link key={item.name} href={item.href}>
                  <div
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 transition-colors cursor-pointer ${
                      pathname === item.href
                        ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white"
                        : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  )
}

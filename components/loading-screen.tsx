"use client"

import { motion } from "framer-motion"

export default function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden"
    >
      {/* Faint starfield */}
      <div className="absolute inset-0">
        {Array.from({ length: 60 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 2 + 0.5}px`,
              height: `${Math.random() * 2 + 0.5}px`,
              opacity: Math.random() * 0.6 + 0.2,
            }}
          />
        ))}
      </div>

      <div className="relative text-center">
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Orbit ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-blue-500/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 shadow-[0_0_12px_2px_rgba(251,191,36,0.7)]" />
          </motion.div>

          {/* Middle spinner ring */}
          <motion.div
            className="absolute inset-3 rounded-full border-2 border-purple-500/20 border-t-purple-400"
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />

          {/* Core sun */}
          <div className="absolute inset-[38%] rounded-full bg-gradient-to-br from-yellow-300 to-orange-500 shadow-[0_0_20px_6px_rgba(251,146,60,0.55)]" />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-display text-white text-lg tracking-wide"
        >
          Uzay yolculuğu başlıyor
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
          >
            ...
          </motion.span>
        </motion.p>
      </div>
    </motion.div>
  )
}

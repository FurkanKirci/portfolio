"use client"

import { Canvas } from "@react-three/fiber"
import { Suspense } from "react"
import { motion } from "framer-motion"
import { Code, Database, Server, Globe, Terminal, GitBranch, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Navigation from "@/components/navigation"
import SpaceBackground from "@/components/space-background"

const skillCategories = [
  {
    title: "Frontend",
    icon: Globe,
    skills: ["JavaScript", "React", "Next.js", "Tailwind CSS", "Bootstrap", "HTML", "CSS"],
    color: "from-blue-400 to-cyan-400",
  },
  {
    title: "Backend",
    icon: Server,
    skills: ["Node.js", "Java", "C#", "Spring Boot"],
    color: "from-purple-400 to-pink-400",
  },
  {
    title: "Database",
    icon: Database,
    skills: ["MongoDB", "MySQL", "MsSQL", "Mongoose", "Firebase", "PostgreSQL"],
    color: "from-green-400 to-emerald-400",
  },
  {
    title: "DevOps & Tools",
    icon: Terminal,
    skills: ["Linux", "SSH", "Bash Script", "PM2"],
    color: "from-orange-400 to-red-400",
  },
  {
    title: "Version Control",
    icon: GitBranch,
    skills: ["Git", "Github", "Ionos", "Plesk Panel"],
    color: "from-yellow-400 to-orange-400",
  },
  {
    title: "Frameworks",
    icon: Code,
    skills: ["Express", "Hibernate", ".NET", "JSP", "Next-Auth", "Auth0", "JWT"],
    color: "from-indigo-400 to-purple-400",
  },
]

export default function SkillsPage() {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      {/* 3D Background */}
      <div className="fixed inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
          <Suspense fallback={null}>
            <SpaceBackground color="#06b6d4" />
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
              className="inline-flex items-center space-x-2 mb-8 px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-300 hover:bg-cyan-500/30 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Güneş Sistemine Dön</span>
            </motion.div>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-6xl mx-auto"
          >
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
                Yeteneklerim
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-cyan-400 to-blue-400 mx-auto"></div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {skillCategories.map((category, index) => (
                <motion.div
                  key={category.title}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, rotateY: 5 }}
                  className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${category.color}`}>
                      <category.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">{category.title}</h3>
                  </div>

                  <div className="space-y-3">
                    {category.skills.map((skill, skillIndex) => (
                      <motion.div
                        key={skill}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 + skillIndex * 0.05 }}
                        className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${category.color}`}></div>
                          <span className="text-gray-300">{skill}</span>
                        </div>
                        {/* <div className="flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i < 4 ? `bg-gradient-to-r ${category.color}` : "bg-gray-600"
                              }`}
                            />
                          ))}
                        </div> */}
                      </motion.div>
                    ))}
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

"use client"

import { motion } from "framer-motion"
import { Code, Database, Server, Globe, Terminal, GitBranch } from "lucide-react"

const skillCategories = [
  {
    title: "Frontend",
    icon: Globe,
    skills: ["JavaScript", "React", "Next.js"],
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
    skills: ["MongoDB", "MySQL", "MsSQL", "Mongoose"],
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
    skills: ["Express", "Hibernate", ".NET", "JSP"],
    color: "from-indigo-400 to-purple-400",
  },
]

export default function Skills() {
  return (
    <section id="skills" className="min-h-screen flex items-center py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              Yeteneklerim
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-cyan-400 mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {skillCategories.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${category.color}`}>
                    <category.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">{category.title}</h3>
                </div>

                <div className="space-y-2">
                  {category.skills.map((skill, skillIndex) => (
                    <motion.div
                      key={skill}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 + skillIndex * 0.05 }}
                      viewport={{ once: true }}
                      className="flex items-center space-x-2"
                    >
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${category.color}`}></div>
                      <span className="text-gray-300">{skill}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

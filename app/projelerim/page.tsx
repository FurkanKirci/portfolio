"use client"

import { Canvas } from "@react-three/fiber"
import { Suspense } from "react"
import { motion } from "framer-motion"
import { Code, ExternalLink, Github, ArrowLeft, Rocket, Database, Globe } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/navigation"
import SpaceBackground from "@/components/space-background"

const projects = [
  {
    title: "E-Ticaret Platformu",
    description:
      "Next.js, Node.js ve MongoDB kullanarak geliştirilen modern e-ticaret platformu. Kullanıcı yönetimi, ürün kataloğu, sepet işlemleri ve ödeme entegrasyonu içerir.",
    technologies: ["Next.js", "Node.js", "MongoDB", "Stripe", "Tailwind CSS"],
    category: "Fullstack",
    status: "Tamamlandı",
    github: "https://github.com/furkankirci",
    demo: "https://Pengona.com",
    color: "from-blue-500 to-cyan-500",
    githubButton: "Github - Private",
    linkButton: "Pengona.com",
    icon: Globe,
  },
  {
    title: "Proje Yönetim Sistemleri",
    description:
      "Takım çalışması için geliştirilmiş proje yönetim uygulaması. Görev atama, ilerleme takibi, dosya paylaşımı ve gerçek zamanlı bildirimler. (Rheinland Privatschule ve Aselsan Konya Silah Sistemleri A.Ş.)",
    technologies: ["React", "Express", "Socket.io", "Redux", "Next.js", "Node.js", "MongoDB", "Stripe", "Tailwind CSS", "Java", "Spring"],
    category: "Web App, Fullstack",
    status: "Tamamlandı",
    github: "https://github.com/furkankirci",
    demo: "https://almanca.at/courseTypeSelectionGER",
    githubButton: "Github - Private",
    linkButton: "almanca.at",
    color: "from-purple-500 to-pink-500",
    icon: Rocket,
  },
  {
    title: "Mobil Eczane Deposu Uygulaması",
    description:
      "React Native ile geliştirilmiş İlaç takip uygulaması. İlaç kullanım saatleri, kullanım sıklığı, kullanım süresi ve kullanım amacı gibi bilgileri takip edebilirsiniz.",
    technologies: ["React Native", "Firebase", "Context Api", "Node.js", "MongoDB", "Google Firebase", "JWT"],
    category: "Mobile",
    status: "Beta",
    github: "https://github.com/furkankirci",
    demo: "https://demo-fitness.com",
    githubButton: "Github - Private",
    linkButton: "Play Store",
    color: "from-orange-500 to-red-500",
    icon: Code,
  },
  {
    title: "Chat Platformu",
    description:
      "Nextjs ile geliştirilmiş chat platformu. Kullanıcılar arasında mesajlaşma yapabilirler. Dosya paylaşımı ve görüntüleme özellikleri mevcuttur. (Rheinland Privatschule)",
    technologies: ["Next.js", "Java", "Spring", "Socket.io", "Mysql"],
    category: "Web",
    status: "Geliştiriliyor",
    github: "https://github.com/furkankirci",
    demo: "https://demo-chatbot.com",
    githubButton: "Github - Private",
    linkButton: "Chat İzniniz Yok",
    color: "from-indigo-500 to-purple-500",
    icon: Rocket,
  },
  {
    title: "Almanca Telc Sınavı Kayıt Sistemi",
    description: "Admin, Okullar, Okul Çalışanları ve Öğrenci rolleri bulunan Sınavların okullara dağıtıldığı, okulların sınav tarihleri belirlediği ve öğrencilerin sınavlara kayıt olabildiği bir sistem.",
    technologies: ["Paypal", "Mysql", "Next.Js", "Express", "Java", "Spring", "Hibernate", "Rest Api"],
    category: "Web",
    status: "Tamamlandı",
    github: "https://github.com/furkankirci",
    demo: "https://telc.org",
    githubButton: "Github - Private",
    linkButton: "Telc.org",
    color: "from-yellow-500 to-orange-500",
    icon: Database,
  },
  {
    title: "İçeriği Yönetilebilir Portfolyo",
    description:
      "Şu anda gezmiş olduğunuz internet sitesinin içerikleri MongoDB içinde tutuluyor. Bu içerikler bir mobil uygulama üzerinden güncelleniyor.",
    technologies: ["React Native", "MongoDB", "Node.js"],
    category: "Web, Mobile",
    status: "Geliştiriliyor",
    github: "https://github.com/furkankirci",
    demo: "https://demo-analytics.com",
    githubButton: "Github",
    linkButton: "gariban.space",
    color: "from-green-500 to-emerald-500",
    icon: Code,
  },
]

export default function ProjectsPage() {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      {/* 3D Background */}
      <div className="fixed inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
          <Suspense fallback={null}>
            <SpaceBackground color="#10b981" />
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
              className="inline-flex items-center space-x-2 mb-8 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Güneş Sistemine Dön</span>
            </motion.div>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-7xl mx-auto"
          >
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent mb-4">
                Projelerim
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-emerald-400 to-green-400 mx-auto mb-6"></div>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Geliştirdiğim projeler ve teknolojik çözümler. Her proje farklı teknolojiler ve yaklaşımlar kullanarak
                oluşturulmuştur.
              </p>
            </div>

            {/* Projects Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map((project, index) => (
                <motion.div
                  key={project.title}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm group"
                >
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${project.color}`}>
                        <project.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                          {project.title}
                        </h3>
                        <p className="text-sm text-gray-400">{project.category}</p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        project.status === "Tamamlandı"
                          ? "bg-green-500/20 text-green-300 border border-green-500/30"
                          : project.status === "Geliştiriliyor"
                            ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>

                  {/* Project Description */}
                  <p className="text-gray-300 leading-relaxed mb-6 line-clamp-3">{project.description}</p>

                  {/* Technologies */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-white mb-3">Teknolojiler</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.technologies.map((tech, techIndex) => (
                        <span
                          key={tech}
                          className="px-2 py-1 bg-gray-800/50 border border-gray-600/50 rounded text-xs text-gray-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Project Links */}
                  <div className="flex space-x-3">
                    <Button
                      asChild
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                    >
                      <a href={project.github} target="_blank" rel="noopener noreferrer">
                        <Github className="w-4 h-4 mr-2" />
                        {project.githubButton}
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 bg-transparent"
                    >
                      <a href={project.demo} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {project.linkButton}
                      </a>
                    </Button>
                  </div>

                  {/* Hover Glow Effect */}
                  <div
                    className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-r ${project.color} pointer-events-none`}
                  />
                </motion.div>
              ))}
            </div>

            {/* Additional Info Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-16 text-center"
            >
              <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl p-8 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-white mb-4">Daha Fazla Proje</h3>
                <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                  GitHub profilimde daha fazla açık kaynak proje ve katkılarımı inceleyebilirsiniz. Sürekli olarak yeni
                  teknolojiler öğreniyor ve projeler geliştiriyorum.
                </p>
                <Button
                  asChild
                  className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                >
                  <a href="https://github.com/FurkanKirci" target="_blank" rel="noopener noreferrer">
                    <Github className="w-5 h-5 mr-2" />
                    GitHub Profilimi Ziyaret Et
                  </a>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

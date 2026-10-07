'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { frame, useApp } from '@/lib/store'
import { smoothstep } from '@/lib/math'
import { BOARD, DIE, boardLayout, glowTraces, type Part } from './layout'
import { SevenSeg, chipTopTexture, makeBoardTextures, makeDieTexture } from './textures'
import { BOOT, GLOW_GROUPS, sys } from '../system'
import { presence } from '../uniforms'

/* ----------------------------------------------------------------- malzemeler */

function materials() {
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o)
  const phys = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o)
  return {
    epoxy: std({ color: '#121418', roughness: 0.5, metalness: 0 }),
    plastic: std({ color: '#181b21', roughness: 0.62 }),
    plasticGrey: std({ color: '#262a32', roughness: 0.55 }),
    ferrite: std({ color: '#33373d', roughness: 0.82 }),
    alu: phys({ color: '#c6ced8', metalness: 1, roughness: 0.3, anisotropy: 0.6, anisotropyRotation: Math.PI / 2 }),
    aluShiny: phys({ color: '#dbe2ea', metalness: 1, roughness: 0.16 }),
    anodized: phys({ color: '#161b23', metalness: 0.8, roughness: 0.36, clearcoat: 0.4, clearcoatRoughness: 0.4 }),
    gold: std({ color: '#cfa863', metalness: 1, roughness: 0.24 }),
    rubber: std({ color: '#0b0c0e', roughness: 0.9 }),
    substrate: phys({ color: '#0f1915', roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.28 }),
    silicon: phys({ color: '#20262e', metalness: 0.6, roughness: 0.25 }),
    underfill: std({ color: '#17120e', roughness: 0.6 }),
    ssdPcb: phys({ color: '#0b1220', roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    glossy: phys({ color: '#0e1014', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 }),
    edge: std({ color: '#3a3f33', roughness: 0.75 }),
  }
}

type Mats = ReturnType<typeof materials>

function boxAt(w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y + h / 2, z)
  return m
}

function withTop(side: THREE.Material, top: THREE.Material) {
  return [side, side, top, side, side, side]
}

function topMat(base: THREE.MeshStandardMaterial, tex: THREE.Texture) {
  const m = base.clone()
  m.map = tex
  m.color = new THREE.Color('#ffffff')
  return m
}

function haloTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.18, 'rgba(200,236,255,0.55)')
  g.addColorStop(0.5, 'rgba(127,214,255,0.12)')
  g.addColorStop(1, 'rgba(127,214,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function fanBlurTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 30, 128, 128, 126)
  g.addColorStop(0, 'rgba(30,34,40,0.0)')
  g.addColorStop(0.25, 'rgba(26,30,36,0.65)')
  g.addColorStop(0.9, 'rgba(22,26,32,0.55)')
  g.addColorStop(1, 'rgba(22,26,32,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = 'rgba(180,200,220,0.05)'
  for (let i = 0; i < 40; i++) {
    ctx.lineWidth = 1 + Math.random() * 2
    ctx.beginPath()
    ctx.arc(128, 128, 36 + Math.random() * 88, 0, Math.PI * 2)
    ctx.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function holesTexture(cols: number, rows: number, aspect: number) {
  const W = 512
  const H = Math.round(W / aspect)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#1b1e24'
  ctx.fillRect(0, 0, W, H)
  const cw = W / cols
  const ch = H / rows
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const x = i * cw + cw * 0.18
      const y = j * ch + ch * 0.18
      ctx.fillStyle = '#050608'
      ctx.fillRect(x, y, cw * 0.64, ch * 0.64)
      ctx.fillStyle = 'rgba(200,170,100,0.35)'
      ctx.fillRect(x + cw * 0.26, y + ch * 0.26, cw * 0.12, ch * 0.12)
    }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/* --------------------------------------------------------------- kartı kur */

interface Model {
  group: THREE.Group
  ledMat: THREE.MeshBasicMaterial
  ledHalo: THREE.Sprite
  ringMat: THREE.MeshBasicMaterial
  fanRotor: THREE.Group
  fanBlur: THREE.Mesh
  fanBlades: THREE.Mesh[]
  qcode: SevenSeg
  qMat: THREE.MeshBasicMaterial
  dbgMats: THREE.MeshBasicMaterial[]
  dieMat: THREE.MeshPhysicalMaterial
  xtalHalo: THREE.Sprite
  glowMat: THREE.ShaderMaterial
  ledLight: THREE.PointLight
  key: THREE.RectAreaLight
  rim: THREE.RectAreaLight
  sweep: THREE.RectAreaLight
  dispose: () => void
}

function buildModel(texSize: number, aniso: number): Model {
  const L = boardLayout()
  const M = materials()
  const group = new THREE.Group()
  group.name = 'board'
  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x)
    return x
  }

  // PCB gövdesi + dokulu üst yüzey
  const tex = makeBoardTextures(L, texSize, aniso)
  track(tex.color)
  track(tex.data)
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(BOARD.w, BOARD.t, BOARD.d), M.edge)
  pcb.position.y = -BOARD.t / 2 - 0.001
  group.add(pcb)
  const topGeo = new THREE.PlaneGeometry(BOARD.w, BOARD.d)
  topGeo.rotateX(-Math.PI / 2)
  const boardMat = new THREE.MeshPhysicalMaterial({
    map: tex.color,
    bumpMap: tex.data,
    bumpScale: 2.2,
    roughnessMap: tex.data,
    metalnessMap: tex.data,
    roughness: 1,
    metalness: 1,
    clearcoat: 0.55,
    clearcoatRoughness: 0.32,
  })
  const top = new THREE.Mesh(topGeo, boardMat)
  group.add(top)

  const dieTex = track(makeDieTexture(texSize >= 3000 ? 2048 : 1536))
  const dieMat = new THREE.MeshPhysicalMaterial({
    map: dieTex,
    emissiveMap: dieTex,
    emissive: new THREE.Color('#9fdcff'),
    emissiveIntensity: 0,
    metalness: 0.5,
    roughness: 0.16,
    iridescence: 0.45,
    iridescenceIOR: 1.45,
    iridescenceThicknessRange: [90, 320],
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  })

  const labelTextures = new Map<string, THREE.Texture>()
  const label = (key: string, lines: string[], aspect: number, opts?: Parameters<typeof chipTopTexture>[2]) => {
    let t = labelTextures.get(key)
    if (!t) {
      t = track(chipTopTexture(lines, aspect, opts))
      labelTextures.set(key, t)
    }
    return t
  }

  let ledMat!: THREE.MeshBasicMaterial
  let ringMat!: THREE.MeshBasicMaterial
  let qMat!: THREE.MeshBasicMaterial
  const qcode = new SevenSeg()
  track(qcode.texture)
  const dbgMats: THREE.MeshBasicMaterial[] = []
  const fanRotor = new THREE.Group()
  const fanBlades: THREE.Mesh[] = []
  let fanBlur!: THREE.Mesh
  const halo = track(haloTexture())

  const addPart = (p: Part, m: Mats) => {
    switch (p.kind) {
      case 'soc': {
        group.add(boxAt(p.w, p.h, p.d, m.substrate, p.x, 0, p.z))
        group.add(boxAt(DIE.w + 0.12, 0.022, DIE.d + 0.12, m.underfill, p.x, p.h, p.z))
        const die = boxAt(DIE.w, DIE.y - p.h, DIE.d, withTop(m.silicon, dieMat), p.x, p.h, p.z)
        group.add(die)
        break
      }
      case 'dram':
      case 'bios':
      case 'sio':
      case 'lan':
      case 'qfn': {
        const lines =
          p.kind === 'dram' ? ['MFK', 'LPDDR5 16Gb', '2610 · KR'] : p.kind === 'bios' ? ['25Q256', 'MFK'] : [p.label ?? '', '2610']
        const t = label(p.kind + p.label, lines, p.w / p.d)
        group.add(boxAt(p.w, p.h, p.d, withTop(m.epoxy, topMat(m.epoxy, t)), p.x, 0, p.z))
        break
      }
      case 'choke': {
        const t = label('choke', ['R22'], 1, { dark: '#33373d', ink: 'rgba(12,12,14,0.65)', logo: false })
        const geo = new RoundedBoxGeometry(p.w, p.h, p.d, 2, 0.05)
        const mesh = new THREE.Mesh(geo, m.ferrite)
        mesh.position.set(p.x, p.h / 2, p.z)
        group.add(mesh)
        const cap = new THREE.Mesh(new THREE.PlaneGeometry(p.w * 0.8, p.d * 0.8).rotateX(-Math.PI / 2), topMat(m.ferrite, t))
        cap.position.set(p.x, p.h + 0.002, p.z)
        group.add(cap)
        break
      }
      case 'mosfet':
        group.add(boxAt(p.w, p.h, p.d, m.epoxy, p.x, 0, p.z))
        break
      case 'pcap': {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(p.w / 2, p.w / 2, p.h - 0.06, 28), m.alu)
        body.position.set(p.x, 0.06 + (p.h - 0.06) / 2, p.z)
        group.add(body)
        const seal = new THREE.Mesh(new THREE.CylinderGeometry(p.w / 2 + 0.01, p.w / 2 + 0.01, 0.06, 28), m.rubber)
        seal.position.set(p.x, 0.03, p.z)
        group.add(seal)
        const vent = new THREE.Mesh(new THREE.CircleGeometry(p.w / 2 * 0.98, 28).rotateX(-Math.PI / 2), m.aluShiny)
        vent.position.set(p.x, p.h + 0.001, p.z)
        group.add(vent)
        break
      }
      case 'eps': {
        const t = holesTexture(4, 2, p.w / p.d)
        track(t)
        group.add(boxAt(p.w, p.h, p.d, withTop(m.plastic, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })), p.x, 0, p.z))
        break
      }
      case 'atx': {
        const t = holesTexture(2, 12, p.w / p.d)
        track(t)
        group.add(boxAt(p.w, p.h, p.d, withTop(m.plastic, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })), p.x, 0, p.z))
        group.add(boxAt(0.14, 0.5, 0.7, m.plastic, p.x - p.w / 2 - 0.07, p.h - 0.6, p.z))
        break
      }
      case 'fanhdr':
      case 'fpanel': {
        const n = p.kind === 'fanhdr' ? 4 : 5
        const rows = p.kind === 'fanhdr' ? 1 : 2
        group.add(boxAt(p.w, 0.16, p.d, m.plastic, p.x, 0, p.z))
        for (let i = 0; i < n; i++)
          for (let j = 0; j < rows; j++) {
            const x = p.x - p.w / 2 + (i + 0.5) * (p.w / n)
            const z = rows === 1 ? p.z : p.z + (j - 0.5) * 0.254
            group.add(boxAt(0.064, p.h, 0.064, m.gold, x, 0, z))
          }
        break
      }
      case 'qcode': {
        qMat = new THREE.MeshBasicMaterial({ map: qcode.texture, color: new THREE.Color(1, 1, 1) })
        group.add(boxAt(p.w, p.h, p.d, withTop(m.epoxy, qMat), p.x, 0, p.z))
        break
      }
      case 'dbgled': {
        const mat = new THREE.MeshBasicMaterial({ color: '#1a2028' })
        dbgMats.push(mat)
        group.add(boxAt(p.w, p.h, p.d, mat, p.x, 0, p.z))
        break
      }
      case 'xtal': {
        const can = new THREE.Mesh(new RoundedBoxGeometry(p.w, p.h, p.d, 4, 0.12), m.aluShiny)
        can.position.set(p.x, p.h / 2, p.z)
        group.add(can)
        const t = label('xtal', ['25.000', 'MFK 2610'], 2.6, { dark: 'transparent', ink: 'rgba(30,36,46,0.8)', logo: false })
        const decal = new THREE.Mesh(
          new THREE.PlaneGeometry(p.w * 0.72, p.d * 0.62).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
        )
        decal.position.set(p.x, p.h + 0.004, p.z)
        group.add(decal)
        break
      }
      case 'shroud': {
        // Yonga seti soğutucusu: delikli üst plaka, kanatçıklar ve fan
        const s = new THREE.Shape()
        const hw = p.w / 2
        const hd = p.d / 2
        const rr = 0.3
        s.moveTo(-hw + rr, -hd)
        s.lineTo(hw - rr, -hd)
        s.quadraticCurveTo(hw, -hd, hw, -hd + rr)
        s.lineTo(hw, hd - rr)
        s.quadraticCurveTo(hw, hd, hw - rr, hd)
        s.lineTo(-hw + rr, hd)
        s.quadraticCurveTo(-hw, hd, -hw, hd - rr)
        s.lineTo(-hw, -hd + rr)
        s.quadraticCurveTo(-hw, -hd, -hw + rr, -hd)
        const hole = new THREE.Path()
        hole.absarc(0, 0, 1.72, 0, Math.PI * 2, true)
        s.holes.push(hole)
        const plate = new THREE.Mesh(
          new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 48 }),
          m.anodized,
        )
        plate.rotation.x = -Math.PI / 2
        plate.position.set(p.x, p.h - 0.14, p.z)
        group.add(plate)
        // yan duvarlar
        group.add(boxAt(p.w, p.h - 0.14, 0.1, m.anodized, p.x, 0, p.z - hd + 0.05))
        group.add(boxAt(p.w, p.h - 0.14, 0.1, m.anodized, p.x, 0, p.z + hd - 0.05))
        group.add(boxAt(0.1, p.h - 0.14, p.d, m.anodized, p.x - hw + 0.05, 0, p.z))
        group.add(boxAt(0.1, p.h - 0.14, p.d, m.anodized, p.x + hw - 0.05, 0, p.z))
        group.add(boxAt(p.w - 0.2, 0.06, p.d - 0.2, m.alu, p.x, 0, p.z))
        for (let i = 0; i < 11; i++) group.add(boxAt(0.035, 0.32, p.d - 0.4, m.alu, p.x - 1.6 + i * 0.32, 0.06, p.z))
        // fan
        fanRotor.position.set(p.x, 0.5, p.z)
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.55, 0.16, 40), m.glossy)
        fanRotor.add(hub)
        const sticker = new THREE.Mesh(
          new THREE.CircleGeometry(0.42, 40).rotateX(-Math.PI / 2),
          new THREE.MeshStandardMaterial({ map: label('fan', ['MFK'], 1, { dark: '#101318', ink: 'rgba(127,214,255,0.7)', logo: false }), roughness: 0.4 }),
        )
        sticker.position.y = 0.081
        fanRotor.add(sticker)
        const bladeShape = new THREE.Shape()
        bladeShape.moveTo(0, -0.18)
        bladeShape.quadraticCurveTo(0.7, -0.32, 1.12, -0.06)
        bladeShape.quadraticCurveTo(1.18, 0.22, 1.02, 0.36)
        bladeShape.quadraticCurveTo(0.6, 0.18, 0, 0.2)
        const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.025, bevelEnabled: false, curveSegments: 12 })
        bladeGeo.rotateX(-Math.PI / 2)
        bladeGeo.translate(0.5, 0, 0)
        const bladeMat = new THREE.MeshStandardMaterial({ color: '#15181e', roughness: 0.55, transparent: true })
        for (let i = 0; i < 7; i++) {
          const blade = new THREE.Mesh(bladeGeo, bladeMat)
          const holder = new THREE.Group()
          holder.rotation.y = (i / 7) * Math.PI * 2
          blade.rotation.x = 0.32
          holder.add(blade)
          fanRotor.add(holder)
          fanBlades.push(blade)
        }
        group.add(fanRotor)
        fanBlur = new THREE.Mesh(
          new THREE.CircleGeometry(1.68, 64).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ map: track(fanBlurTexture()), transparent: true, opacity: 0, depthWrite: false }),
        )
        fanBlur.position.set(p.x, 0.6, p.z)
        group.add(fanBlur)
        break
      }
      case 'm2': {
        const y0 = 0.22
        group.add(boxAt(p.w, 0.08, p.d, m.ssdPcb, p.x, y0, p.z))
        group.add(boxAt(1.0, 0.42, 2.4, m.plastic, p.x - p.w / 2 - 0.35, 0, p.z))
        for (let i = 0; i < 18; i++) group.add(boxAt(0.14, 0.01, 0.07, m.gold, p.x - p.w / 2 + 0.12, y0 + 0.08, p.z - 0.8 + i * 0.095))
        const chip = (w: number, d: number, x: number, z: number, lines: string[]) =>
          group.add(boxAt(w, 0.1, d, withTop(m.epoxy, topMat(m.epoxy, label('m2' + lines[0], lines, w / d))), x, y0 + 0.08, z))
        chip(0.95, 0.95, p.x + 2.65, p.z, ['MFK', 'NVMe CTRL'])
        chip(0.7, 0.7, p.x + 1.45, p.z - 0.4, ['DRAM'])
        const stickerTex = label('ssd', ['MFK NVMe', '1 TB · PCIe 4.0 x4 · 2280', 'S/N 2603-2610'], 2.4, {
          dark: '#0b0d11',
          ink: 'rgba(214,228,242,0.85)',
        })
        const stickerMat = new THREE.MeshStandardMaterial({ map: stickerTex, roughness: 0.65 })
        group.add(boxAt(4.6, 0.11, 1.9, withTop(m.epoxy, stickerMat), p.x - 0.9, y0 + 0.08, p.z))
        const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 24), m.alu)
        screw.position.set(p.x + p.w / 2 - 0.15, y0 + 0.13, p.z)
        group.add(screw)
        group.add(boxAt(0.3, y0, 0.3, m.alu, p.x + p.w / 2 - 0.15, 0, p.z))
        break
      }
      case 'pcie': {
        const t = holesTexture(1, 1, 12)
        track(t)
        const slotTop = new THREE.MeshStandardMaterial({ color: '#06070a', roughness: 0.7 })
        group.add(boxAt(p.w, p.h, p.d * 0.62, withTop(m.plastic, slotTop), p.x, 0, p.z))
        group.add(boxAt(p.w + 0.06, p.h * 0.7, 0.05, m.alu, p.x, 0, p.z - p.d / 2 + 0.02))
        group.add(boxAt(p.w + 0.06, p.h * 0.7, 0.05, m.alu, p.x, 0, p.z + p.d / 2 - 0.02))
        group.add(boxAt(p.w + 0.06, 0.05, p.d, m.alu, p.x, p.h * 0.7, p.z))
        group.add(boxAt(0.55, p.h + 0.1, p.d + 0.06, m.plasticGrey, p.x + p.w / 2 + 0.3, 0, p.z))
        break
      }
      case 'pwrsw': {
        group.add(boxAt(p.w, 0.2, p.d, m.plastic, p.x, 0, p.z))
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.3, 0.16, 40), m.glossy)
        cap.position.set(p.x, 0.28, p.z)
        group.add(cap)
        ringMat = new THREE.MeshBasicMaterial({ color: '#7fd6ff' })
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.016, 10, 64).rotateX(Math.PI / 2), ringMat)
        ring.position.set(p.x, 0.205, p.z)
        group.add(ring)
        break
      }
      case 'sbled': {
        ledMat = new THREE.MeshBasicMaterial({ color: '#cfeeff' })
        group.add(boxAt(p.w, p.h, p.d, ledMat, p.x, 0, p.z))
        break
      }
      case 'battery': {
        const holder = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.12, 48), m.plastic)
        holder.position.set(p.x, 0.06, p.z)
        group.add(holder)
        const cell = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.3, 64), m.aluShiny)
        cell.position.set(p.x, 0.06 + 0.15, p.z)
        group.add(cell)
        const t = label('bat', ['CR2032', '3V  +'], 1, { dark: '#cfd6de', ink: 'rgba(40,46,56,0.7)', logo: false })
        const disc = new THREE.Mesh(
          new THREE.CircleGeometry(0.98, 64).rotateX(-Math.PI / 2),
          new THREE.MeshPhysicalMaterial({ map: t, metalness: 1, roughness: 0.18 }),
        )
        disc.position.set(p.x, 0.361, p.z)
        group.add(disc)
        break
      }
      case 'hole': {
        const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.1, 32), m.alu)
        screw.position.set(p.x, 0.05, p.z)
        group.add(screw)
        break
      }
    }
  }
  for (const p of L.parts) addPart(p, M)

  // SMD pasifler: gövde + metal uçlar (instanced)
  const smdN = L.smd.length
  const bodyGeo = new THREE.BoxGeometry(1, 1, 1)
  bodyGeo.translate(0, 0.5, 0)
  const bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.55 }), smdN)
  const ends = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ color: '#aeb6bf', metalness: 1, roughness: 0.46 }), smdN * 2)
  const mtx = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const sc = new THREE.Vector3()
  const pos = new THREE.Vector3()
  const col = new THREE.Color()
  const yAxis = new THREE.Vector3(0, 1, 0)
  L.smd.forEach((s, i) => {
    q.setFromAxisAngle(yAxis, -s.rot)
    pos.set(s.x, 0, s.z)
    sc.set(s.len * 0.66, s.h, s.wid)
    mtx.compose(pos, q, sc)
    bodies.setMatrixAt(i, mtx)
    const tone = Math.random()
    if (s.kind === 0) col.setRGB(0.36 + tone * 0.08, 0.27 + tone * 0.05, 0.17 + tone * 0.03)
    else col.setRGB(0.035, 0.037, 0.04)
    bodies.setColorAt(i, col)
    for (const side of [-1, 1]) {
      const off = side * s.len * 0.41
      pos.set(s.x + Math.cos(s.rot) * off, 0, s.z + Math.sin(s.rot) * off)
      sc.set(s.len * 0.17, s.h * 1.03, s.wid * 1.04)
      mtx.compose(pos, q, sc)
      ends.setMatrixAt(i * 2 + (side > 0 ? 1 : 0), mtx)
    }
  })
  bodies.instanceMatrix.needsUpdate = true
  if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true
  ends.instanceMatrix.needsUpdate = true
  group.add(bodies, ends)

  // LED ışığı ve haleler
  const [lx, ly, lz] = L.anchors.led
  const ledLight = new THREE.PointLight('#cfeeff', 0, 9, 2)
  ledLight.position.set(lx, ly + 0.35, lz)
  group.add(ledLight)
  const ledHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: '#cfeeff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
  ledHalo.position.set(lx, ly + 0.05, lz)
  ledHalo.scale.setScalar(0.9)
  group.add(ledHalo)
  const [xx, xy, xz] = L.anchors.xtal
  const xtalHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: '#7fd6ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }))
  xtalHalo.position.set(xx, xy + 0.1, xz)
  xtalHalo.scale.setScalar(2.4)
  group.add(xtalHalo)

  // Stüdyo ışıkları
  RectAreaLightUniformsLib.init()
  const key = new THREE.RectAreaLight('#d8ecff', 0, 30, 7)
  key.position.set(-11, 17, 13)
  key.lookAt(0, 0, 0)
  const rim = new THREE.RectAreaLight('#93c9ff', 0, 34, 1.6)
  rim.position.set(7, 4.5, -16)
  rim.lookAt(0, 0, 1)
  const sweep = new THREE.RectAreaLight('#e8f6ff', 0, 1.8, 36)
  sweep.position.set(-20, 8, 6)
  sweep.lookAt(-20, 0, 0)
  group.add(key, rim, sweep)

  // Parlayan izler (açılışta akımın yolculuğu)
  const glowMat = glowMaterial()
  group.add(new THREE.Mesh(glowGeometry(), glowMat))

  const disposeAll = () => {
    disposables.forEach((d) => d.dispose())
    group.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat?.dispose()
    })
  }

  return {
    group,
    ledMat,
    ledHalo,
    ringMat,
    fanRotor,
    fanBlur,
    fanBlades,
    qcode,
    qMat,
    dbgMats,
    dieMat,
    xtalHalo,
    glowMat,
    ledLight,
    key,
    rim,
    sweep,
    dispose: disposeAll,
  }
}

/* ------------------------------------------------------------ parlayan izler */

function glowGeometry() {
  const traces = glowTraces([...GLOW_GROUPS])
  const pos: number[] = []
  const dist: number[] = []
  const side: number[] = []
  const grp: number[] = []
  const len: number[] = []
  const rnd: number[] = []
  const idx: number[] = []
  let base = 0
  for (const t of traces) {
    const gi = GLOW_GROUPS.indexOf(t.group as (typeof GLOW_GROUPS)[number])
    const hw = Math.max(0.014, t.width * 0.62)
    const r = Math.random()
    let acc = 0
    for (let i = 0; i < t.pts.length; i++) {
      const [x, z] = t.pts[i]
      const prev = t.pts[Math.max(0, i - 1)]
      const next = t.pts[Math.min(t.pts.length - 1, i + 1)]
      let dx = next[0] - prev[0]
      let dz = next[1] - prev[1]
      const l = Math.hypot(dx, dz) || 1
      dx /= l
      dz /= l
      if (i > 0) acc += Math.hypot(x - prev[0], z - prev[1])
      for (const s of [-1, 1]) {
        pos.push(x - dz * hw * s, 0.004, z + dx * hw * s)
        dist.push(acc)
        side.push(s)
        grp.push(gi)
        len.push(t.len)
        rnd.push(r)
      }
      if (i > 0) {
        const a = base + (i - 1) * 2
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
    base += t.pts.length * 2
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('aDist', new THREE.Float32BufferAttribute(dist, 1))
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1))
  g.setAttribute('aGroup', new THREE.Float32BufferAttribute(grp, 1))
  g.setAttribute('aLen', new THREE.Float32BufferAttribute(len, 1))
  g.setAttribute('aRand', new THREE.Float32BufferAttribute(rnd, 1))
  g.setIndex(idx)
  return g
}

function glowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uAct: { value: sys.glowAct },
      uHead: { value: sys.glowHead },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#8fdcff').multiplyScalar(1.45) },
      uWarm: { value: new THREE.Color('#ffb37a').multiplyScalar(1.35) },
      uFade: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aDist;
      attribute float aSide;
      attribute float aGroup;
      attribute float aLen;
      attribute float aRand;
      uniform float uAct[10];
      uniform float uHead[10];
      varying float vDist;
      varying float vSide;
      varying float vLen;
      varying float vRand;
      varying float vAct;
      varying float vHead;
      varying float vGroup;
      void main() {
        int gi = int(aGroup + 0.5);
        vAct = uAct[gi];
        vHead = uHead[gi];
        vDist = aDist;
        vSide = aSide;
        vLen = aLen;
        vRand = aRand;
        vGroup = aGroup;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uWarm;
      uniform float uFade;
      varying float vDist;
      varying float vSide;
      varying float vLen;
      varying float vRand;
      varying float vAct;
      varying float vHead;
      varying float vGroup;
      void main() {
        if (vAct <= 0.001) discard;
        float u = vDist / max(vLen, 0.001);
        float pulse = 0.0;
        if (vHead >= 0.0 && vHead < 1.35) {
          pulse = exp(-pow((u - vHead) * 14.0, 2.0)) * 1.9;
          pulse += smoothstep(vHead - 0.4, vHead, u) * step(u, vHead) * 0.55;
        }
        float dash = smoothstep(0.55, 1.0, sin(vDist * 7.0 - uTime * 6.0 + vRand * 6.283) * 0.5 + 0.5);
        float edge = 1.0 - abs(vSide);
        edge = 0.35 + 0.65 * edge;
        float i = (pulse + dash * 0.42 + 0.1) * vAct * edge * uFade;
        vec3 c = vGroup < 2.5 ? mix(uColor, uWarm, 0.5) : uColor;
        gl_FragColor = vec4(c * i, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

/* --------------------------------------------------------------- bileşen */

export function Board({ texSize, aniso }: { texSize: number; aniso: number }) {
  const model = useMemo(() => buildModel(texSize, aniso), [texSize, aniso])
  const scene = useThree((s) => s.scene)
  useEffect(() => () => model.dispose(), [model])

  useFrame((state, dt) => {
    const p = presence.board.value
    model.group.visible = p > 0.002
    if (!model.group.visible) return
    const t = state.clock.elapsedTime
    const power = useApp.getState().power

    // LED: beklemede nefes alır, açılınca sabit
    const led = sys.led
    model.ledMat.color.setRGB(0.55 + led * 2.6, 0.75 + led * 3.0, 0.9 + led * 3.4)
    ;(model.ledHalo.material as THREE.SpriteMaterial).opacity = 0.08 + led * 0.5
    model.ledHalo.scale.setScalar(0.45 + led * 0.45)
    model.ledLight.intensity = (0.25 + led * 1.6) * (1 - sys.env * 0.7)
    const b = sys.button
    model.ringMat.color.setRGB(0.25 + b * 1.4, 0.55 + b * 2.4, 0.75 + b * 3.0)

    // Stüdyo ışıkları ve açılıştaki ışık süpürmesi
    const env = sys.env
    model.key.intensity = env * 2.6
    model.rim.intensity = env * 9
    const bt = frame.bootT
    const sweepT = power === 'booting' ? smoothstep(0.5, 2.0, bt) : power === 'on' ? 1 : 0
    model.sweep.position.x = -18 + sweepT * 36
    model.sweep.lookAt(model.sweep.position.x, 0, 0)
    model.sweep.intensity = power === 'booting' ? Math.sin(sweepT * Math.PI) * 18 : 0

    // Fan: hızlandıkça kanatlar bulanık bir diske dönüşür (gerçek kameradaki gibi)
    const rpm = sys.rpm
    model.fanRotor.rotation.y -= (rpm / 60) * Math.PI * 2 * Math.min(dt, 0.05)
    const blur = smoothstep(260, 1100, rpm)
    ;(model.fanBlur.material as THREE.MeshBasicMaterial).opacity = blur * 0.92
    const bladeMat = model.fanBlades[0].material as THREE.MeshStandardMaterial
    bladeMat.opacity = 1 - blur * 0.82

    // Q-Code ve hata ayıklama LED'leri
    model.qcode.draw(sys.qcode)
    const qOn = sys.qcode.trim() ? 1 : 0
    model.qMat.color.setScalar(0.6 + qOn * 1.8)
    model.dbgMats.forEach((m, i) => (sys.dbg[i] ? m.color.setRGB(1.6, 2.6, 3.2) : m.color.set('#1a2028')))

    // Çip: güç geldikçe kalıbın yolları ışır
    model.dieMat.emissiveIntensity = sys.dieGlow * 1.25
    ;(model.xtalHalo.material as THREE.SpriteMaterial).opacity = sys.xtal * 0.9
    model.xtalHalo.scale.setScalar(1.8 + Math.sin(t * 25) * 0.04 + sys.xtal * 0.8)

    model.glowMat.uniforms.uTime.value = t
    model.glowMat.uniforms.uFade.value = p
    if (power === 'booting' && bt > BOOT.end) model.glowMat.uniforms.uFade.value = 1
    scene.environmentIntensity = 0.04 + env * 0.95
  })

  return <primitive object={model.group} />
}

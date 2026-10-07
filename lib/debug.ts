'use client'

import { finishBoot, powerOn, skipBoot } from './actions'
import { chapters } from './content'
import { frame, useApp } from './store'
import { getLenis, scrollTarget } from './loop'
import { logoForm } from '@/components/canvas/particles/formations'
import * as THREE from 'three'
import { BOARD_SHOTS, debugShot } from '@/components/canvas/shots'

/** Geliştirme yardımcıları: tarayıcı konsolundan `__mfk.goto(4.5)` gibi. */
export function installDebug() {
  const w = window as unknown as Record<string, unknown>
  w.__mfk = {
    frame,
    state: () => useApp.getState(),
    power: (fast = true) => powerOn({ fast }),
    skip: () => skipBoot(),
    /** açılış sinematiğini belirli bir saniyede dondur (-1: serbest bırak) */
    bootAt: (t: number) => {
      if (useApp.getState().power === 'off') powerOn()
      frame.debugBootT = t
    },
    finish: () => finishBoot(),
    /** logo formasyonunun kahraman kamerasına göre ekran kutusu */
    logo: () => {
      const d = logoForm(32)
      const cam = BOARD_SHOTS.hero
      let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, minz = 1e9, maxz = -1e9
      for (let i = 0; i < d.length; i += 4) {
        minx = Math.min(minx, d[i]); maxx = Math.max(maxx, d[i])
        miny = Math.min(miny, d[i + 1]); maxy = Math.max(maxy, d[i + 1])
        minz = Math.min(minz, d[i + 2]); maxz = Math.max(maxz, d[i + 2])
      }
      return { minx, maxx, miny, maxy, minz, maxz, cam: cam.pos.toArray(), fonts: document.fonts.check('600 20px "Instrument Sans Variable"') }
    },
    /** katmanları gizle/göster (yalnızca 3B sahneyi görmek için) */
    overlay: (on: boolean) => {
      document.querySelectorAll<HTMLElement>('.layer, main, [data-overlay]').forEach((el) => (el.style.opacity = on ? '' : '0'))
    },
    /** kamerayı elle sabitle; argümansız çağrı serbest bırakır */
    shot: (pos?: [number, number, number], target?: [number, number, number], fov = 34, range = 0) => {
      debugShot.pose = pos && target ? { pos: new THREE.Vector3(...pos), target: new THREE.Vector3(...target), fov, range } : null
      frame.snap = 2
    },
    /** dünya noktasını ekran pikseline çevir */
    project: (x: number, y: number, z: number) => {
      const cam = debugShot.camera
      if (!cam) return null
      const v = new THREE.Vector3(x, y, z).project(cam)
      return [Math.round((v.x * 0.5 + 0.5) * window.innerWidth), Math.round((-v.y * 0.5 + 0.5) * window.innerHeight)]
    },
    /** film zamanına git: 2.5 = Yetenekler bölümünün ortası */
    goto: (F: number) => {
      const i = Math.min(chapters.length - 1, Math.floor(F))
      const y = scrollTarget(chapters[i].id, F - i)
      getLenis()?.scrollTo(y, { immediate: true, force: true })
      frame.snap = 2
    },
  }
}

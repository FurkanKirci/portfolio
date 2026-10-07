'use client'

import { sound } from './audio'
import { BOOT } from './boot'
import { chapters, type ChapterId } from './content'
import { getLenis, lockScroll, scrollToChapter } from './loop'
import { frame, useApp } from './store'

const BOOT_END = BOOT.end

export function powerOn(opts: { fast?: boolean } = {}) {
  const app = useApp.getState()
  if (app.power !== 'off') return
  sound.powerOn()
  const fast = opts.fast || app.settings.fastBoot
  const now = performance.now()
  app.set({
    power: 'booting',
    bootAt: fast ? now - (BOOT_END - 1.1) * 1000 : now,
    uptimeFrom: Date.now(),
  })
  frame.bootT = fast ? BOOT_END - 1.1 : 0
}

export function skipBoot() {
  const app = useApp.getState()
  if (app.power !== 'booting') return
  sound.postBeep()
  app.set({ bootAt: performance.now() - BOOT_END * 1000 + 250 })
}

/** Açılış süresi dolunca çağrılır. */
export function finishBoot() {
  const app = useApp.getState()
  if (app.power !== 'booting') return
  app.set({ power: 'on' })
  frame.bootT = -1
  lockScroll(false)
  // /#iletisim gibi bir bağlantıyla gelindiyse açılış bitince oraya git
  const target = chapterFromHash(window.location.hash)
  if (target) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    window.setTimeout(() => jumpTo(target), 250)
  }
}

/** Ctrl+Alt+Del, "Yeniden başlat", kernel panic sonrası. */
export function reboot(opts: { toStandby?: boolean } = {}) {
  const app = useApp.getState()
  sound.powerOff()
  app.set({ blackout: true, bios: false, menu: false, proc: null, panic: false })
  window.setTimeout(() => {
    getLenis()?.scrollTo(0, { immediate: true, force: true })
    lockScroll(true)
    frame.snap = 3
    useApp.getState().set({ power: 'off', bootAt: 0 })
    frame.bootT = -1
    window.setTimeout(() => {
      useApp.getState().set({ blackout: false })
      if (!opts.toStandby) window.setTimeout(() => powerOn(), 650)
    }, 450)
  }, 520)
}

export function toggleSound(force?: boolean) {
  const app = useApp.getState()
  const next = force ?? !app.settings.sound
  sound.init()
  app.setSettings({ sound: next })
  sound.setEnabled(next)
  sound.click()
}

/** Adres çubuğundaki #iletisim gibi bir bağlantının işaret ettiği bölüm. */
export function chapterFromHash(hash: string): ChapterId | null {
  const slug = decodeURIComponent(hash.replace(/^#/, '')).toLowerCase()
  if (!slug) return null
  const alias: Record<string, string> = { projelerim: 'projeler', iletişim: 'iletisim', hakkımda: 'hakkimda' }
  const c = chapters.find((x) => x.slug === (alias[slug] ?? slug))
  return c ? c.id : null
}

export function jumpTo(id: ChapterId, local?: number) {
  local ??= chapters.find((c) => c.id === id)?.jump
  const app = useApp.getState()
  app.set({ menu: false, bios: false, proc: null })
  if (app.power === 'off') {
    powerOn({ fast: true })
    const wait = () => {
      if (useApp.getState().power === 'on') scrollToChapter(id, local ?? 0.16)
      else window.setTimeout(wait, 120)
    }
    wait()
    return
  }
  if (app.power === 'booting') {
    skipBoot()
    window.setTimeout(() => scrollToChapter(id, local ?? 0.16), 400)
    return
  }
  scrollToChapter(id, local ?? 0.16)
}

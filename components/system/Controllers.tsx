'use client'

import { useEffect } from 'react'
import { finishBoot, jumpTo, powerOn, reboot, skipBoot, toggleSound } from '@/lib/actions'
import { sound } from '@/lib/audio'
import { BOOT } from '@/lib/boot'
import { commands, profile } from '@/lib/content'
import { onFrame } from '@/lib/loop'
import { clamp, damp, formatUptime } from '@/lib/math'
import { frame, useApp } from '@/lib/store'
import { sys } from '@/components/canvas/system'

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

function typingTarget(e: Event) {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

/** Açılış saati, ses, işaretçi ve klavye. Görünmez; yalnızca davranış. */
export function Controllers() {
  /* ---------------------------------------------------- açılış ve ses döngüsü */
  useEffect(() => {
    let lastQ = ''
    return onFrame((dt) => {
      const app = useApp.getState()
      if (app.power === 'booting') {
        if (frame.debugBootT >= 0) frame.bootT = frame.debugBootT
        else {
          frame.bootT = (performance.now() - app.bootAt) / 1000
          if (frame.bootT >= BOOT.end) finishBoot()
        }
        if (sys.qcode !== lastQ) {
          lastQ = sys.qcode
          sound.qcodeTick()
        }
      }
      // sürükleyerek bakış bırakılınca yavaşça merkeze döner
      if (!frame.look.dragging) {
        frame.look.yaw = damp(frame.look.yaw, 0, 1.2, dt)
        frame.look.pitch = damp(frame.look.pitch, 0, 1.2, dt)
      }
      sound.update({
        power: app.power,
        bootT: frame.bootT,
        film: app.power === 'on' ? frame.film : 0,
        load: frame.load,
        overclock: app.overclock,
        dt,
        rpm: sys.rpm,
      })
    })
  }, [])

  /* -------------------------------------------------------- ayarlar → ses */
  useEffect(() => {
    const apply = () => {
      const s = useApp.getState().settings
      sound.setEnabled(s.sound)
      sound.setVolume(s.volume)
    }
    apply()
    return useApp.subscribe((s, p) => {
      if (s.settings.sound !== p.settings.sound || s.settings.volume !== p.settings.volume) apply()
    })
  }, [])

  /* --------------------------------------------------------------- işaretçi */
  useEffect(() => {
    let dragging = false
    let sx = 0
    let sy = 0
    let yaw0 = 0
    let pitch0 = 0
    const move = (e: PointerEvent) => {
      frame.pointer.x = e.clientX
      frame.pointer.y = e.clientY
      frame.pointer.nx = (e.clientX / window.innerWidth) * 2 - 1
      frame.pointer.ny = -(e.clientY / window.innerHeight) * 2 + 1
      frame.pointer.inside = e.pointerType === 'mouse'
      if (dragging) {
        frame.look.yaw = clamp(yaw0 + ((e.clientX - sx) / window.innerWidth) * 1.1, -0.6, 0.6)
        frame.look.pitch = clamp(pitch0 + ((e.clientY - sy) / window.innerHeight) * 0.6, -0.25, 0.3)
      }
    }
    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('a,button,input,textarea,select,[role="dialog"],.hit')) return
      if (useApp.getState().power !== 'on' || e.button !== 0 || e.pointerType !== 'mouse') return
      dragging = true
      frame.look.dragging = true
      sx = e.clientX
      sy = e.clientY
      yaw0 = frame.look.yaw
      pitch0 = frame.look.pitch
      document.documentElement.classList.add('is-dragging')
    }
    const up = () => {
      dragging = false
      frame.look.dragging = false
      document.documentElement.classList.remove('is-dragging')
    }
    const leave = () => (frame.pointer.inside = false)
    // İlk kullanıcı hareketi: ses bağlamını hazırla (tarayıcı kuralı)
    const unlock = () => sound.init()
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    document.addEventListener('pointerleave', leave)
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      document.removeEventListener('pointerleave', leave)
    }
  }, [])

  /* ---------------------------------------------------------------- klavye */
  useEffect(() => {
    let konami = 0
    let typed = ''
    let lastLetter = 0
    let holdTimer = 0
    let overclockTimer = 0

    const runCommand = (cmd: string) => {
      const app = useApp.getState()
      if (cmd === 'reboot') return reboot()
      if (cmd === 'shutdown' || cmd === 'poweroff') return jumpTo('shutdown', 0.5)
      if (cmd === 'rmrf') {
        sound.panic()
        app.set({ panic: true })
        window.setTimeout(() => reboot(), 4200)
        return
      }
      let out = commands[cmd]
      if (!out) return
      if (out === '__uptime__') out = `up ${formatUptime(Date.now() - (app.uptimeFrom || Date.now()))}, 1 user, load average: ${frame.load.toFixed(2)}`
      if (out === '__date__') out = new Date().toLocaleString('tr-TR', { dateStyle: 'full', timeStyle: 'medium' })
      sound.type()
      app.toast(`$ ${cmd}\n${out}`)
    }

    const onKey = (e: KeyboardEvent) => {
      const app = useApp.getState()
      const typing = typingTarget(e)

      // Ctrl+Alt+Del (Windows bu kombinasyonu sayfaya bırakmaz) veya Ctrl+Alt+Backspace
      if (e.ctrlKey && e.altKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault()
        app.toast('Ctrl+Alt+Del algılandı. Yeniden başlatılıyor…', 'warn')
        reboot()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        sound.click()
        app.set({ menu: !app.menu, bios: false })
        return
      }
      if (typing) return

      if (e.key === 'Delete') {
        e.preventDefault()
        sound.click()
        app.set({ bios: !app.bios, menu: false })
        return
      }
      if (e.key === 'F8') {
        e.preventDefault()
        sound.click()
        app.set({ menu: !app.menu, bios: false })
        return
      }
      if (e.key === 'Escape') {
        if (app.bios || app.menu || app.proc !== null) {
          app.set({ bios: false, menu: false, proc: null })
          sound.panel(false)
        } else if (app.power === 'booting') skipBoot()
        return
      }
      if (app.bios) return

      if (app.power === 'off' && (e.key === 'Enter' || e.key === ' ') && !e.repeat) {
        e.preventDefault()
        sound.chargeStart()
        const start = performance.now()
        window.clearInterval(holdTimer)
        holdTimer = window.setInterval(() => {
          sys.hold = Math.min(1, (performance.now() - start) / 650)
          if (sys.hold >= 1) {
            window.clearInterval(holdTimer)
            sys.hold = 0
            powerOn()
          }
        }, 16)
        return
      }
      const now = performance.now()
      const midWord = now - lastLetter < 800
      if (e.key.length === 1 && /[a-z]/i.test(e.key)) lastLetter = now
      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !midWord) {
        toggleSound()
        app.toast(useApp.getState().settings.sound ? 'Ses açık' : 'Ses kapalı')
        return
      }

      // Konami: hız aşırtma (ve ardından termal kısma)
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      konami = k === KONAMI[konami] ? konami + 1 : k === KONAMI[0] ? 1 : 0
      if (konami === KONAMI.length) {
        konami = 0
        app.set({ overclock: true })
        app.toast('Hız aşırtma: 25.000 → 31.337 MHz. Fanlar tam devir.', 'warn')
        window.clearTimeout(overclockTimer)
        overclockTimer = window.setTimeout(() => {
          useApp.getState().set({ overclock: false })
          useApp.getState().toast('Termal kısma devrede. Saat normale döndü.', 'ok')
        }, 9000)
      }

      // Klavyeden yazılan küçük komutlar (whoami, uname, sudo, reboot…)
      if (e.key.length === 1 && /[a-z\-/ ]/i.test(e.key)) {
        typed = (typed + e.key.toLowerCase()).slice(-24)
        const compact = typed.replace(/\s+/g, ' ')
        if (/sudo rm -rf\s?\/?$/.test(compact) || compact.endsWith('rm -rf /')) {
          typed = ''
          runCommand('rmrf')
          return
        }
        for (const cmd of [...Object.keys(commands), 'reboot', 'shutdown', 'poweroff']) {
          if (compact.endsWith(cmd)) {
            if (cmd === 'sudo') {
              // "sudo" tek başına yazıldıysa bekle; ardından rm gelebilir
              window.setTimeout(() => {
                if (typed.replace(/\s+/g, ' ').endsWith('sudo')) {
                  typed = ''
                  runCommand('sudo')
                }
              }, 900)
              return
            }
            typed = ''
            runCommand(cmd)
            return
          }
        }
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (useApp.getState().power === 'off' && sys.hold > 0 && sys.hold < 1) sound.chargeStop()
        window.clearInterval(holdTimer)
        sys.hold = 0
      }
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      window.clearInterval(holdTimer)
    }
  }, [])

  /* ------------------------------------------------ konsoldaki gizli mesaj */
  useEffect(() => {
    const ice = 'color:#7fd6ff;font-family:monospace;'
    const mute = 'color:#7a8aa3;font-family:monospace;'
    /* eslint-disable no-console */
    console.log(
      `%c${profile.board} ${profile.boardRev} · POST tamamlandı\n%c\n` +
        `Merhaba, meraklı mühendis. Kaynağa bakmak istersen: ${profile.github.url}/portfolio\n\n` +
        `  DEL                 kurulum (gerçek ayarlar)\n` +
        `  F8 / Ctrl+K         önyükleme menüsü\n` +
        `  M                   ses\n` +
        `  ↑↑↓↓←→←→BA          dene ve gör\n` +
        `  Ctrl+Alt+Del        Windows izin verirse… değilse Ctrl+Alt+Backspace\n` +
        `  whoami, uname, sudo, reboot…   sayfadayken klavyeden yaz\n\n` +
        `Bu satırı okuyorsan muhtemelen iyi anlaşırız: ${profile.email}`,
      ice + 'font-size:13px;font-weight:600;',
      mute,
    )
    /* eslint-enable no-console */
  }, [])

  return null
}


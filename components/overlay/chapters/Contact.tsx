'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { reboot } from '@/lib/actions'
import { sound } from '@/lib/audio'
import { contact, profile, shutdownLog } from '@/lib/content'
import { useApp } from '@/lib/store'
import { smoothstep } from '@/lib/math'
import { Layer } from '../Layer'

export interface SendState {
  ok: boolean | null
  message: string
}
export type SendFn = (prev: SendState, data: FormData) => Promise<SendState>

const initial: SendState = { ok: null, message: '' }

/** 0x06 shutdown — süreçler durur, fanlar yavaşlar, ekran tek bir noktaya çöker; geriye iletişim kalır. */
export function Contact({ send }: { send: SendFn }) {
  const [state, action, pending] = useActionState(send, initial)
  const [copied, setCopied] = useState(false)
  const [startedAt, setStartedAt] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok === true) {
      sound.restart()
      formRef.current?.reset()
      useApp.getState().toast(`[  OK  ] ${contact.formOk}`)
    } else if (state.ok === false) {
      sound.error()
    }
  }, [state])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email)
      setCopied(true)
      sound.click()
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${profile.email}`
    }
  }

  const crt = useRef<HTMLDivElement>(null)
  const onLocal = (local: number, on: boolean) => {
    const el = crt.current
    if (!el) return
    // CRT kapanışı: görüntü önce yatay bir çizgiye, sonra tek bir noktaya çöker
    const v = on ? smoothstep(0.64, 0.73, local) : 0
    const h = on ? smoothstep(0.73, 0.8, local) : 0
    const glow = on ? smoothstep(0.62, 0.7, local) * (1 - smoothstep(0.8, 0.86, local)) : 0
    const dot = on ? smoothstep(0.78, 0.82, local) : 0
    el.style.setProperty('--v', v.toFixed(4))
    el.style.setProperty('--h', h.toFixed(4))
    el.style.setProperty('--g', glow.toFixed(4))
    el.style.setProperty('--d', dot.toFixed(4))
    el.style.visibility = v > 0.001 ? 'visible' : 'hidden'
  }

  return (
    <Layer id="shutdown" onLocal={onLocal}>
      <div ref={crt} className="crt" aria-hidden="true">
        <div className="crt-top" />
        <div className="crt-bottom" />
        <div className="crt-left" />
        <div className="crt-right" />
        <div className="crt-line" />
        <div className="crt-dot">
          <span className="led-breathe" />
        </div>
      </div>
      <div className="scrim fade-in" data-in="0.2" data-out="2" />

      {/* kapanış günlüğü */}
      <div
        className="fade-in pointer-events-none absolute left-0 top-0 h-[62vh] w-[72vw]"
        data-in="0.03"
        data-out="0.4"
        style={{ background: 'radial-gradient(ellipse at 0% 0%, rgba(5,7,11,0.9) 0%, rgba(5,7,11,0.6) 34%, rgba(5,7,11,0) 70%)' }}
      />
      <ul className="absolute left-[var(--gutter)] top-[calc(var(--gutter)*0.6+56px)] space-y-1 t-mono text-[12px]">
        {shutdownLog.map((l, i) => (
          <li key={l} className="fade-in" data-in={(0.06 + i * 0.035).toFixed(3)} data-out="0.36" data-len="0.02">
            <span className="text-ok">[  OK  ]</span> <span className="text-mute">{l}</span>
          </li>
        ))}
        <li className="fade-in text-dim" data-in="0.25" data-out="0.36" data-len="0.02">
          Sistem kapanıyor.
        </li>
      </ul>

      <div className="absolute inset-x-[var(--gutter)] top-1/2 grid -translate-y-1/2 gap-7 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-16 lg:w-[min(1180px,calc(100vw-2*var(--gutter)))]">
        <div className="fade-in" data-in="0.38" data-out="2" data-len="0.08">
          <div className="flex items-center gap-3 t-label">
            <span className="text-ice normal-case">0x06</span>
            <span className="h-px w-8 bg-[var(--hair-strong)]" />
            <span>shutdown · iletişim</span>
          </div>
          <h2 className="mt-5 t-display text-[clamp(2.6rem,6.2vw,6rem)] text-ink">{contact.heading}</h2>
          <p className="mt-4 t-serif text-[clamp(1.1rem,1.6vw,1.45rem)] text-mute">Kapanmadan önce, geriye bu kalır.</p>

          <div className="hit mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 md:mt-9">
            <a
              href={`mailto:${profile.email}`}
              className="t-mono text-[clamp(1rem,1.7vw,1.35rem)] text-ink underline decoration-[var(--hair-strong)] underline-offset-[6px] transition-colors hover:text-white hover:decoration-[var(--ice)]"
              onMouseEnter={() => sound.hover()}
            >
              {profile.email}
            </a>
            <button type="button" className="btn-ghost" onClick={copy}>
              {copied ? 'Kopyalandı' : 'Kopyala'}
            </button>
          </div>
          <div className="hit mt-4 flex flex-wrap gap-x-6 gap-y-2 t-mono text-[13px]">
            <a href={profile.github.url} target="_blank" rel="noopener noreferrer" className="text-mute transition-colors hover:text-ink" onMouseEnter={() => sound.hover()}>
              github/{profile.github.handle} ↗
            </a>
            <a href={profile.linkedin.url} target="_blank" rel="noopener noreferrer" className="text-mute transition-colors hover:text-ink" onMouseEnter={() => sound.hover()}>
              linkedin/{profile.linkedin.handle} ↗
            </a>
          </div>
          <p className="mt-5 text-[13.5px] text-dim">{contact.note}</p>
        </div>

        <form
          ref={formRef}
          action={action}
          className="fade-in hit flex flex-col gap-3"
          data-in="0.44"
          data-out="2"
          data-len="0.08"
          onFocus={() => !startedAt && setStartedAt(Date.now())}
        >
          <p className="t-mono text-[11px] text-dim">$ sendmail furkan</p>
          <label className="sr-only" htmlFor="f-name">
            Adın
          </label>
          <input id="f-name" name="name" required minLength={2} maxLength={80} placeholder="Adın" autoComplete="name" className="field" />
          <label className="sr-only" htmlFor="f-email">
            E-posta adresin
          </label>
          <input id="f-email" name="email" type="email" required maxLength={120} placeholder="E-posta adresin" autoComplete="email" className="field" />
          <label className="sr-only" htmlFor="f-msg">
            Mesajın
          </label>
          <textarea id="f-msg" name="message" required minLength={5} maxLength={4000} rows={5} placeholder="Mesajın" className="field h-28 resize-none md:h-auto" />
          {/* bot tuzağı: insanlar görmez */}
          <input name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
          <input type="hidden" name="t" value={startedAt} />
          <div className="mt-1 flex items-center justify-between gap-4">
            <p className={`t-mono text-[12px] ${state.ok === false ? 'text-heat' : 'text-ok'}`} role="status">
              {pending ? 'gönderiliyor…' : state.ok === true ? `[  OK  ] ${contact.formOk}` : state.ok === false ? state.message : ''}
            </p>
            <button type="submit" disabled={pending} className="send-btn" onMouseEnter={() => sound.hover()}>
              Gönder <span aria-hidden="true">↵</span>
            </button>
          </div>
        </form>
      </div>

      <div className="hit absolute bottom-[calc(var(--gutter)*0.6+56px)] left-[var(--gutter)] right-[var(--gutter)] flex items-end justify-between gap-6">
        <button
          type="button"
          className="fade-in btn-ghost whitespace-nowrap"
          data-in="0.86"
          data-out="2"
          onClick={() => {
            sound.click()
            reboot()
          }}
        >
          <span className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 3v8" />
              <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
            </svg>
            Yeniden başlat
          </span>
        </button>
        <p className="fade-in whitespace-nowrap t-mono text-[11px] text-dim" data-in="0.86" data-out="2">
          © 2026 {profile.name}
        </p>
      </div>
    </Layer>
  )
}

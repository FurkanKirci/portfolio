'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { jumpTo, reboot } from '@/lib/actions'
import { sound } from '@/lib/audio'
import { chapters, profile } from '@/lib/content'
import { onFrame } from '@/lib/loop'
import { gpuName, tierLabel, tiers } from '@/lib/quality'
import { defaultSettings, frame, resolvedTier, useApp, type Settings } from '@/lib/store'

type Tab = 'Ana' | 'Gelişmiş' | 'Önyükleme' | 'Çıkış'
const TABS: Tab[] = ['Ana', 'Gelişmiş', 'Önyükleme', 'Çıkış']

interface Item {
  label: string
  /** okunur değer */
  value?: () => string
  /** değiştirilebilir ayarın seçenekleri */
  options?: { key: keyof Settings; values: (string | number | boolean)[]; show: (v: string | number | boolean) => string }
  action?: () => void
  help: string
  section?: string
}

function visitorInfo() {
  let gpu = 'bilinmiyor'
  try {
    const c = document.createElement('canvas')
    gpu = gpuName(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    /* yoksay */
  }
  const nav = navigator as Navigator & { deviceMemory?: number }
  return {
    gpu: gpu.replace(/^ANGLE \((.*)\)$/, '$1').slice(0, 64),
    threads: nav.hardwareConcurrency ? `${nav.hardwareConcurrency} iş parçacığı` : 'bilinmiyor',
    mem: nav.deviceMemory ? `${nav.deviceMemory} GB (tarayıcının bildirdiği)` : 'bilinmiyor',
    screen: `${window.screen.width}×${window.screen.height} · DPR ${window.devicePixelRatio}`,
  }
}

/** DEL: sitenin gerçek ayarları, eski bir BIOS kurulum ekranı gibi. F10 kaydeder, ESC kaydetmeden çıkar. */
export function Bios() {
  const open = useApp((s) => s.bios)
  const saved = useApp((s) => s.settings)
  const autoTier = useApp((s) => s.autoTier)
  const render = useApp((s) => s.render)
  const softwareGL = useApp((s) => s.softwareGL)
  const [draft, setDraft] = useState<Settings>(saved)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const [tab, setTab] = useState(0)
  const [row, setRow] = useState(0)
  const [, tick] = useState(0)
  const clock = useRef<HTMLSpanElement>(null)
  const fps = useRef<HTMLSpanElement>(null)
  const info = useMemo(() => (open ? visitorInfo() : null), [open])

  useEffect(() => {
    if (open) {
      setDraft(useApp.getState().settings)
      setRow(0)
    }
  }, [open])

  useEffect(
    () =>
      onFrame(() => {
        if (!useApp.getState().bios) return
        const now = new Date()
        const t = now.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'medium' })
        if (clock.current && clock.current.textContent !== t) clock.current.textContent = t
        if (fps.current) {
          const f = `${Math.round(frame.fps)} kare/sn`
          if (fps.current.textContent !== f) fps.current.textContent = f
        }
      }),
    [],
  )

  const onOff = (v: string | number | boolean) => (v ? 'Açık' : 'Kapalı')
  const items: Record<Tab, Item[]> = useMemo(() => {
    const tierNow = draft.quality === 'auto' ? autoTier : draft.quality
    return {
      Ana: [
        { label: 'BIOS sürümü', value: () => `${profile.board} ${profile.boardRev} · 2026.10`, help: 'Bu kartın donanım yazılımı. Konya’da derlendi.' },
        { label: 'İşlemci', value: () => `${profile.name} @ 25.000 MHz`, help: 'Tek çekirdekli değil: altı çekirdek, her biri bir yetenek alanı.' },
        { label: 'Bellek', value: () => 'Bilgisayar Mühendisliği · NEÜ · 2019–2024', help: 'Eğitim tamamlandı. Yüksek lisans ile genişletiliyor.' },
        {
          label: 'GPU',
          value: () => (softwareGL ? `${info?.gpu ?? '…'} · YAZILIM` : (info?.gpu ?? '…')),
          help: softwareGL
            ? 'Tarayıcın ekran kartını kullanmıyor, sahneyi işlemciyle çiziyor; bu yüzden yavaş. Chrome/Edge: Ayarlar → Sistem → “Kullanılabilir olduğunda grafik hızlandırmayı kullan” açık olmalı, sonra tarayıcıyı yeniden başlat.'
            : 'Senin ekran kartın. Sahne kalitesi buna göre otomatik seçilir.',
          section: 'Ziyaretçi sistemi',
        },
        { label: 'İşlemci', value: () => info?.threads ?? '…', help: 'navigator.hardwareConcurrency' },
        { label: 'Bellek', value: () => info?.mem ?? '…', help: 'navigator.deviceMemory (tarayıcı yuvarlar).' },
        { label: 'Ekran', value: () => info?.screen ?? '…', help: 'Fiziksel çözünürlük ve piksel oranı.' },
      ],
      Gelişmiş: [
        {
          label: 'Grafik kalitesi',
          options: {
            key: 'quality',
            values: ['auto', 'low', 'medium', 'high', 'ultra'],
            show: (v) => (v === 'auto' ? `Otomatik (${tierLabel[autoTier]})` : tierLabel[v as keyof typeof tierLabel]),
          },
          help: 'Parçacık sayısı, doku çözünürlüğü ve son işleme. Ultra: bir milyon parçacık.',
        },
        { label: 'Parçacık sayısı', value: () => (tiers[tierNow].particles ** 2).toLocaleString('tr-TR'), help: 'GPU’da simüle edilen parçacıklar. Kaliteye bağlıdır.' },
        { label: 'Alan derinliği', options: { key: 'dof', values: [true, false], show: onOff }, help: 'Makro objektif bulanıklığı. Kapatmak performans kazandırır.' },
        { label: 'Bloom', options: { key: 'bloom', values: [true, false], show: onOff }, help: 'Yalnızca gerçekten parlak noktalar ışır.' },
        {
          label: 'Hareket',
          options: { key: 'motion', values: ['full', 'reduced'], show: (v) => (v === 'full' ? 'Tam' : 'Azaltılmış') },
          help: 'Azaltılmış: el kamerası sarsıntısı ve fare paralaksı kapanır.',
        },
        { label: 'Ses', options: { key: 'sound', values: [true, false], show: onOff }, help: 'Bütün sesler tarayıcıda sentezlenir; dosya yok.' },
        {
          label: 'Ses düzeyi',
          options: { key: 'volume', values: [0.25, 0.5, 0.75, 1], show: (v) => `${Math.round((v as number) * 100)}` },
          help: 'Ana ses düzeyi.',
        },
        { label: 'Kare hızı', value: () => '', help: 'Şu anki kare hızı.' },
        {
          label: 'Çizim çözünürlüğü',
          value: () => (render.w ? `${render.w}×${render.h} · %${Math.round(render.scale * 100)}` : '…'),
          help: 'Kare hızı düşünce çözünürlük kendiliğinden iner, akıcılık korunur; rahatlayınca geri çıkar.',
        },
      ],
      Önyükleme: [
        {
          label: 'Hızlı açılış',
          options: { key: 'fastBoot', values: [false, true], show: onOff },
          help: 'Açık: güç düğmesinden sonra açılış sinematiği atlanır.',
        },
        ...chapters.slice(1).map((c, i) => ({
          label: `${i + 1}. ${c.title}`,
          value: () => `${c.code} · ${c.cmd}`,
          action: () => jumpTo(c.id),
          help: `Enter: doğrudan “${c.title}” bölümünden başlat.`,
          section: i === 0 ? 'Önyükleme sırası' : undefined,
        })),
      ],
      Çıkış: [
        { label: 'Kaydet ve çık', value: () => 'F10', action: () => save(), help: 'Ayarları bu tarayıcıya kaydeder.' },
        { label: 'Kaydetmeden çık', value: () => 'ESC', action: () => close(), help: 'Değişiklikleri unutur.' },
        { label: 'Varsayılanları yükle', value: () => 'F9', action: () => setDraft({ ...defaultSettings }), help: 'Fabrika ayarları.' },
        { label: 'Yeniden başlat', value: () => '', action: () => reboot(), help: 'Ctrl+Alt+Del ile aynı.' },
        { label: 'Bekleme moduna al', value: () => 'S5', action: () => reboot({ toStandby: true }), help: 'Ekranı kapatır; güç düğmesi tekrar bekler.' },
      ],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.quality, autoTier, info, render, softwareGL])

  const list = items[TABS[tab]]

  const close = useCallback(() => {
    sound.panel(false)
    useApp.getState().set({ bios: false })
  }, [])
  const save = useCallback(() => {
    useApp.getState().setSettings(draftRef.current)
    sound.restart()
    useApp.getState().set({ bios: false })
    useApp.getState().toast('Ayarlar kaydedildi.')
  }, [])

  const change = useCallback(
    (it: Item, dir: 1 | -1) => {
      if (it.options) {
        const { key, values } = it.options
        setDraft((d) => {
          const i = values.indexOf(d[key] as never)
          const next = values[(i + dir + values.length) % values.length]
          return { ...d, [key]: next }
        })
        sound.click()
      } else if (it.action) {
        sound.click()
        it.action()
      }
    },
    [],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const it = list[row]
      switch (e.key) {
        case 'ArrowRight':
          setTab((t) => (t + 1) % TABS.length)
          setRow(0)
          sound.hover()
          break
        case 'ArrowLeft':
          setTab((t) => (t - 1 + TABS.length) % TABS.length)
          setRow(0)
          sound.hover()
          break
        case 'ArrowDown':
          setRow((r) => (r + 1) % list.length)
          sound.hover()
          break
        case 'ArrowUp':
          setRow((r) => (r - 1 + list.length) % list.length)
          sound.hover()
          break
        case 'Enter':
        case '+':
        case ' ':
          if (it) change(it, 1)
          break
        case '-':
          if (it) change(it, -1)
          break
        case 'F9':
          setDraft({ ...defaultSettings })
          sound.click()
          break
        case 'F10':
          save()
          break
        default:
          return
      }
      e.preventDefault()
      tick((x) => x + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, list, row, change, save])

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  return (
    <div
      className="fixed inset-0 z-[58] bg-[#060a14] t-mono text-[13px] text-ink transition-opacity duration-200"
      style={{ opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden' }}
      role="dialog"
      aria-modal="true"
      aria-label="BIOS kurulum ekranı"
      aria-hidden={!open}
      data-lenis-prevent
    >
      <div className="scanlines pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mx-auto flex h-full max-w-[1100px] flex-col px-[var(--gutter)] py-[calc(var(--gutter)*0.6)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hair-strong)] pb-3">
          <p>
            <span className="text-ice">{profile.board}</span> Kurulum Yardımcısı <span className="text-dim">· v26.10</span>
          </p>
          <span ref={clock} className="text-mute" />
        </header>
        <nav className="mt-3 flex gap-1" role="tablist">
          {TABS.map((t, i) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === i}
              className="px-3 py-1.5 transition-colors"
              style={{ background: tab === i ? 'var(--ice)' : 'transparent', color: tab === i ? '#060a14' : 'var(--mute)' }}
              onClick={() => {
                setTab(i)
                setRow(0)
                sound.click()
              }}
              tabIndex={open ? 0 : -1}
            >
              {t}
            </button>
          ))}
        </nav>

        <div className="mt-4 grid min-h-0 flex-1 gap-6 md:grid-cols-[1fr_280px]">
          <ul className="min-h-0 overflow-y-auto border border-[var(--hair)] p-2">
            {list.map((it, i) => {
              const val = it.options ? it.options.show(draft[it.options.key]) : it.label === 'Kare hızı' ? null : it.value?.()
              return (
                <li key={it.label + i}>
                  {it.section && <p className="px-3 pb-1 pt-4 text-[11px] tracking-[0.14em] text-ice uppercase">{it.section}</p>}
                  <button
                    type="button"
                    className="flex w-full items-baseline justify-between gap-6 px-3 py-[7px] text-left"
                    style={{ background: row === i ? 'rgba(127,214,255,0.12)' : 'transparent' }}
                    onMouseEnter={() => setRow(i)}
                    onClick={() => change(it, 1)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      change(it, -1)
                    }}
                    tabIndex={open ? 0 : -1}
                  >
                    <span className={it.options || it.action ? 'text-ink' : 'text-mute'}>{it.label}</span>
                    <span className={`truncate text-right ${it.options ? 'text-ice' : 'text-ink/80'}`}>
                      {it.label === 'Kare hızı' ? <span ref={fps} /> : it.options ? `[${val}]` : val}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <aside className="hidden border border-[var(--hair)] p-4 md:block">
            <p className="text-[11px] tracking-[0.14em] text-ice uppercase">Yardım</p>
            <p className="mt-3 font-sans text-[14px] leading-relaxed text-ink/90">{list[row]?.help}</p>
            {dirty && <p className="mt-6 text-[12px] text-heat">Kaydedilmemiş değişiklikler var. F10 ile kaydet.</p>}
            <p className="mt-6 text-[11px] leading-relaxed text-dim">
              Şu anki kalite: {tierLabel[resolvedTier()]}
              <br />
              Değerler bu tarayıcıda saklanır.
            </p>
          </aside>
        </div>

        <footer className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--hair-strong)] pt-3 text-[11px] text-mute">
          <span>
            <span className="kbd">←→</span> sekme
          </span>
          <span>
            <span className="kbd">↑↓</span> seç
          </span>
          <span>
            <span className="kbd">Enter</span> <span className="kbd">+</span> <span className="kbd">-</span> değiştir
          </span>
          <span>
            <span className="kbd">F9</span> varsayılanlar
          </span>
          <button type="button" onClick={save} className="hover:text-ink" tabIndex={open ? 0 : -1}>
            <span className="kbd">F10</span> kaydet ve çık
          </button>
          <button type="button" onClick={close} className="hover:text-ink" tabIndex={open ? 0 : -1}>
            <span className="kbd">ESC</span> çık
          </button>
        </footer>
      </div>
    </div>
  )
}

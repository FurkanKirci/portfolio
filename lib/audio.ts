'use client'

/**
 * Sitenin bütün sesleri burada sentezlenir; hiçbir ses dosyası yok.
 *
 *  - 50 Hz şebeke uğultusu (Türkiye'de şebeke 50 Hz)
 *  - PSU rölesinin klik sesi ve kondansatör dolumu
 *  - fan: filtrelenmiş gürültü + kanat geçiş frekansı (devir/60 × 7 kanat)
 *  - POST bip'i: PC hoparlörünün klasik 896 Hz kare dalgası (1193182 / 1331)
 *  - ortam: düşük geçirgen filtreli, yavaş nefes alan bir drone ve bölüme göre katmanlar
 *  - arayüz: tuş, klik, yazma tıkırtıları
 *
 * Tarayıcılar sesi ancak bir kullanıcı hareketinden sonra başlatmaya izin verir;
 * ilk hareket güç tuşuna basmaktır. Ses her an "M" ile ya da sağ üstten kapatılabilir.
 */

export interface AudioFrame {
  power: 'off' | 'booting' | 'on'
  bootT: number
  film: number
  load: number
  overclock: boolean
  dt: number
  /** görsel fanla aynı devir (components/canvas/system.ts) */
  rpm: number
}

const PC_SPEAKER_HZ = 1193182 / 1331 // ≈ 896.4 Hz

class SoundEngine {
  ctx: AudioContext | null = null
  private out!: GainNode
  private master!: GainNode
  private bus!: GainNode
  private reverb!: ConvolverNode
  private reverbSend!: GainNode
  private noise!: AudioBuffer
  private pink!: AudioBuffer

  private enabled = true
  private volume = 0.75
  private started = false

  // sürekli sesler
  private humGain!: GainNode
  private fanGain!: GainNode
  private fanBand!: BiquadFilterNode
  private fanLow!: BiquadFilterNode
  private bladeOsc!: OscillatorNode
  private bladeGain!: GainNode
  private fanAm!: GainNode
  private fanLfo!: OscillatorNode
  private droneGain!: GainNode
  private droneFilter!: BiquadFilterNode
  private droneOsc: OscillatorNode[] = []
  private cityGain!: GainNode
  private windGain!: GainNode
  private windBand!: BiquadFilterNode
  private shimmerGain!: GainNode
  private chargeOsc: OscillatorNode | null = null
  private chargeGain: GainNode | null = null

  private rpm = 0
  private lastType = 0
  private lastHover = 0
  private beeped = false
  private seekNext = 0

  /** İlk kullanıcı hareketinde çağrılır. */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && this.enabled) void this.ctx.resume()
      return
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx({ latencyHint: 'interactive' })
    this.ctx = ctx

    this.noise = this.makeNoise(2.5, false)
    this.pink = this.makeNoise(3, true)

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.knee.value = 12
    comp.ratio.value = 4
    comp.attack.value = 0.004
    comp.release.value = 0.25

    this.out = ctx.createGain()
    this.out.gain.value = this.enabled ? this.volume : 0
    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    this.bus = ctx.createGain()
    this.bus.gain.value = 1

    this.reverb = ctx.createConvolver()
    this.reverb.buffer = this.makeImpulse(2.8, 2.6)
    this.reverbSend = ctx.createGain()
    this.reverbSend.gain.value = 0.32

    this.bus.connect(this.master)
    this.bus.connect(this.reverbSend)
    this.reverbSend.connect(this.reverb)
    this.reverb.connect(this.master)
    this.master.connect(comp)
    comp.connect(this.out)
    this.out.connect(ctx.destination)

    this.buildContinuous()
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return
      if (document.hidden) void this.ctx.suspend()
      else if (this.enabled) void this.ctx.resume()
    })
  }

  setEnabled(on: boolean) {
    this.enabled = on
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.out.gain.cancelScheduledValues(t)
    this.out.gain.setTargetAtTime(on ? this.volume : 0, t, 0.08)
    if (on && this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setVolume(v: number) {
    this.volume = v
    if (!this.ctx || !this.enabled) return
    this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
  }

  /* ------------------------------------------------------------ yardımcılar */

  private makeNoise(seconds: number, pink: boolean) {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1
        if (!pink) {
          d[i] = w
          continue
        }
        // Paul Kellet'in pembe gürültü filtresi
        b0 = 0.99886 * b0 + w * 0.0555179
        b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.969 * b2 + w * 0.153852
        b3 = 0.8665 * b3 + w * 0.3104856
        b4 = 0.55 * b4 + w * 0.5329522
        b5 = -0.7616 * b5 - w * 0.016898
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
        b6 = w * 0.115926
      }
    }
    return buf
  }

  private makeImpulse(seconds: number, decay: number) {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      let lp = 0
      for (let i = 0; i < len; i++) {
        const t = i / len
        const w = (Math.random() * 2 - 1) * Math.pow(1 - t, decay)
        lp += (w - lp) * (0.35 - t * 0.25) // kuyruk ilerledikçe kararan yansımalar
        d[i] = i < ctx.sampleRate * 0.018 ? 0 : lp
      }
    }
    return buf
  }

  private loopNoise(pink = false) {
    const src = this.ctx!.createBufferSource()
    src.buffer = pink ? this.pink : this.noise
    src.loop = true
    src.loopStart = Math.random() * 0.5
    return src
  }

  private env(g: GainNode, t: number, a: number, peak: number, hold: number, r: number) {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a)
    g.gain.setValueAtTime(Math.max(0.0002, peak), t + a + hold)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + r)
  }

  private burst(opts: {
    t?: number
    dur: number
    gain: number
    type?: BiquadFilterType
    freq: number
    q?: number
    sweepTo?: number
    send?: boolean
  }) {
    const ctx = this.ctx
    if (!ctx || !this.started) return
    const t = opts.t ?? ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = opts.type ?? 'bandpass'
    f.frequency.setValueAtTime(opts.freq, t)
    if (opts.sweepTo) f.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + opts.dur)
    f.Q.value = opts.q ?? 1
    const g = ctx.createGain()
    this.env(g, t, 0.002, opts.gain, 0, opts.dur)
    src.connect(f)
    f.connect(g)
    g.connect(opts.send === false ? this.master : this.bus)
    src.start(t, Math.random() * 1.5)
    src.stop(t + opts.dur + 0.05)
  }

  private tone(opts: {
    t?: number
    freq: number
    to?: number
    type?: OscillatorType
    dur: number
    gain: number
    a?: number
    lp?: number
  }) {
    const ctx = this.ctx
    if (!ctx || !this.started) return
    const t = opts.t ?? ctx.currentTime
    const o = ctx.createOscillator()
    o.type = opts.type ?? 'sine'
    o.frequency.setValueAtTime(opts.freq, t)
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + opts.dur)
    const g = ctx.createGain()
    this.env(g, t, opts.a ?? 0.004, opts.gain, 0, opts.dur)
    let node: AudioNode = o
    if (opts.lp) {
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = opts.lp
      o.connect(f)
      node = f
    }
    node.connect(g)
    g.connect(this.bus)
    o.start(t)
    o.stop(t + (opts.a ?? 0.004) + opts.dur + 0.05)
  }

  /* -------------------------------------------------------- sürekli katmanlar */

  private buildContinuous() {
    const ctx = this.ctx!

    // Şebeke uğultusu: 50 Hz ve harmonikleri, çok kısık
    this.humGain = ctx.createGain()
    this.humGain.gain.value = 0
    const humLp = ctx.createBiquadFilter()
    humLp.type = 'lowpass'
    humLp.frequency.value = 420
    ;[50, 100, 150, 200].forEach((f, i) => {
      const o = ctx.createOscillator()
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.value = [1, 0.5, 0.28, 0.12][i]
      o.connect(g)
      g.connect(humLp)
      o.start()
    })
    humLp.connect(this.humGain)
    this.humGain.connect(this.master)

    // Fan
    const fanSrc = this.loopNoise(false)
    this.fanBand = ctx.createBiquadFilter()
    this.fanBand.type = 'bandpass'
    this.fanBand.Q.value = 0.6
    this.fanLow = ctx.createBiquadFilter()
    this.fanLow.type = 'lowpass'
    this.fanAm = ctx.createGain()
    this.fanAm.gain.value = 1
    this.fanLfo = ctx.createOscillator()
    this.fanLfo.frequency.value = 10
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 0.12
    this.fanLfo.connect(lfoDepth)
    lfoDepth.connect(this.fanAm.gain)
    this.fanLfo.start()
    this.fanGain = ctx.createGain()
    this.fanGain.gain.value = 0
    fanSrc.connect(this.fanBand)
    this.fanBand.connect(this.fanLow)
    this.fanLow.connect(this.fanAm)
    this.fanAm.connect(this.fanGain)
    this.fanGain.connect(this.master)
    fanSrc.start()

    this.bladeOsc = ctx.createOscillator()
    this.bladeOsc.type = 'triangle'
    this.bladeGain = ctx.createGain()
    this.bladeGain.gain.value = 0
    const bladeLp = ctx.createBiquadFilter()
    bladeLp.type = 'lowpass'
    bladeLp.frequency.value = 520
    this.bladeOsc.connect(bladeLp)
    bladeLp.connect(this.bladeGain)
    this.bladeGain.connect(this.master)
    this.bladeOsc.start()

    // Ortam drone'u: La (55 Hz) üzerine beşli ve oktav, hafif akortsuz testereler
    this.droneFilter = ctx.createBiquadFilter()
    this.droneFilter.type = 'lowpass'
    this.droneFilter.frequency.value = 220
    this.droneFilter.Q.value = 0.8
    this.droneGain = ctx.createGain()
    this.droneGain.gain.value = 0
    const voices: [number, OscillatorType, number][] = [
      [55, 'sawtooth', 0.5],
      [55.21, 'sawtooth', 0.5],
      [82.41, 'sawtooth', 0.28],
      [110.3, 'triangle', 0.3],
      [164.8, 'sine', 0.12],
      [27.5, 'sine', 0.7],
    ]
    for (const [f, type, amp] of voices) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.value = amp
      o.connect(g)
      g.connect(this.droneFilter)
      o.start()
      this.droneOsc.push(o)
    }
    const breath = ctx.createOscillator()
    breath.frequency.value = 0.045
    const breathDepth = ctx.createGain()
    breathDepth.gain.value = 70
    breath.connect(breathDepth)
    breathDepth.connect(this.droneFilter.frequency)
    breath.start()
    this.droneFilter.connect(this.droneGain)
    this.droneGain.connect(this.bus)

    // Şehir uğultusu (silikon şehir)
    const citySrc = this.loopNoise(true)
    const cityLp = ctx.createBiquadFilter()
    cityLp.type = 'lowpass'
    cityLp.frequency.value = 380
    this.cityGain = ctx.createGain()
    this.cityGain.gain.value = 0
    citySrc.connect(cityLp)
    cityLp.connect(this.cityGain)
    this.cityGain.connect(this.bus)
    citySrc.start()

    // Rüzgâr (harita)
    const windSrc = this.loopNoise(true)
    this.windBand = ctx.createBiquadFilter()
    this.windBand.type = 'bandpass'
    this.windBand.frequency.value = 500
    this.windBand.Q.value = 0.9
    this.windGain = ctx.createGain()
    this.windGain.gain.value = 0
    const windLfo = ctx.createOscillator()
    windLfo.frequency.value = 0.07
    const windDepth = ctx.createGain()
    windDepth.gain.value = 260
    windLfo.connect(windDepth)
    windDepth.connect(this.windBand.frequency)
    windLfo.start()
    windSrc.connect(this.windBand)
    this.windBand.connect(this.windGain)
    this.windGain.connect(this.bus)
    windSrc.start()

    // Çekirdekler yüklenirken ince bir parıltı
    this.shimmerGain = ctx.createGain()
    this.shimmerGain.gain.value = 0
    ;[880, 1318.5, 1760].forEach((f, i) => {
      const o = ctx.createOscillator()
      o.frequency.value = f * (1 + (i - 1) * 0.0015)
      const trem = ctx.createOscillator()
      trem.frequency.value = 0.2 + i * 0.13
      const tg = ctx.createGain()
      tg.gain.value = 0.5
      const g = ctx.createGain()
      g.gain.value = 0.5
      trem.connect(tg)
      tg.connect(g.gain)
      o.connect(g)
      g.connect(this.shimmerGain)
      o.start()
      trem.start()
    })
    this.shimmerGain.connect(this.bus)
  }

  /* -------------------------------------------------------------- olaylar */

  /** Güç tuşu basılı tutulurken yükselen dolum sesi. */
  chargeStart() {
    this.init()
    const ctx = this.ctx
    if (!ctx) return
    this.started = true
    this.chargeStop()
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(70, t)
    o.frequency.exponentialRampToValueAtTime(210, t + 0.7)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.6)
    o.connect(g)
    g.connect(this.bus)
    o.start(t)
    this.chargeOsc = o
    this.chargeGain = g
    this.humGain.gain.setTargetAtTime(0.012, t, 0.3)
  }

  chargeStop() {
    const ctx = this.ctx
    if (!ctx || !this.chargeOsc || !this.chargeGain) return
    const t = ctx.currentTime
    this.chargeGain.gain.cancelScheduledValues(t)
    this.chargeGain.gain.setTargetAtTime(0.0001, t, 0.04)
    this.chargeOsc.stop(t + 0.3)
    this.chargeOsc = null
    this.chargeGain = null
  }

  /** PSU rölesi + kondansatör dolumu. */
  powerOn() {
    this.init()
    if (!this.ctx) return
    this.started = true
    this.chargeStop()
    const t = this.ctx.currentTime + 0.01
    this.burst({ t, dur: 0.012, gain: 0.5, type: 'highpass', freq: 1800, send: false })
    this.tone({ t, freq: 95, to: 42, dur: 0.12, gain: 0.32 })
    this.burst({ t: t + 0.028, dur: 0.008, gain: 0.16, type: 'highpass', freq: 2400, send: false })
    this.burst({ t: t + 0.06, dur: 0.28, gain: 0.035, type: 'bandpass', freq: 300, sweepTo: 2600, q: 2 })
    this.beeped = false
    this.droneGain.gain.setTargetAtTime(0.05, t + 0.4, 1.4)
  }

  postBeep() {
    if (!this.ctx || this.beeped) return
    this.beeped = true
    const t = this.ctx.currentTime + 0.005
    this.tone({ t, freq: PC_SPEAKER_HZ, type: 'square', dur: 0.15, gain: 0.05, a: 0.003, lp: 2600 })
  }

  qcodeTick() {
    this.tone({ freq: 2350, dur: 0.012, gain: 0.006 })
  }

  seek() {
    this.burst({ dur: 0.006, gain: 0.03, freq: 3200 + Math.random() * 1600, q: 3 })
  }

  hover() {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    if (now - this.lastHover < 0.045) return
    this.lastHover = now
    this.burst({ dur: 0.008, gain: 0.014, freq: 5200, q: 4 })
  }

  click() {
    this.burst({ dur: 0.006, gain: 0.05, type: 'highpass', freq: 2200 })
    this.tone({ freq: 190, to: 95, dur: 0.035, gain: 0.05 })
  }

  panel(open: boolean) {
    this.burst({ dur: 0.01, gain: 0.04, type: 'highpass', freq: 2000 })
    this.burst({ dur: 0.2, gain: 0.018, freq: open ? 700 : 2400, sweepTo: open ? 2400 : 700, q: 1.2 })
  }

  type() {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    if (now - this.lastType < 0.028) return
    this.lastType = now
    this.burst({ dur: 0.004, gain: 0.006 + Math.random() * 0.006, freq: 3000 + Math.random() * 2400, q: 2 })
  }

  chime(high = false) {
    const f = high ? 1318.5 : 987.8
    this.tone({ freq: f, dur: 0.9, gain: 0.016, a: 0.006 })
    this.tone({ freq: f * 1.5, dur: 0.6, gain: 0.006, a: 0.006 })
  }

  packet() {
    this.tone({ freq: 1480, to: 1760, dur: 0.07, gain: 0.014 })
    const t = (this.ctx?.currentTime ?? 0) + 0.11
    this.tone({ t, freq: 1480, to: 1760, dur: 0.07, gain: 0.007 })
  }

  error() {
    this.burst({ dur: 0.01, gain: 0.05, type: 'highpass', freq: 1800 })
    this.tone({ freq: 118, type: 'square', dur: 0.09, gain: 0.03, lp: 900 })
  }

  restart() {
    const t = this.ctx?.currentTime ?? 0
    this.tone({ t: t + 0.0, freq: 659.3, dur: 0.12, gain: 0.02 })
    this.tone({ t: t + 0.09, freq: 987.8, dur: 0.22, gain: 0.018 })
  }

  /** Kapanış: kondansatör boşalması + son tık. */
  powerOff() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.tone({ t, freq: 1500, to: 60, dur: 1.1, gain: 0.02 })
    this.tone({ t: t + 0.02, freq: 80, to: 38, dur: 0.18, gain: 0.22 })
    this.burst({ t: t + 0.01, dur: 0.01, gain: 0.25, type: 'highpass', freq: 1700, send: false })
  }

  panic() {
    this.error()
    this.burst({ dur: 0.5, gain: 0.05, freq: 400, sweepTo: 90, q: 0.7 })
  }

  /* ------------------------------------------------------- her kare güncelleme */

  update(f: AudioFrame) {
    const ctx = this.ctx
    if (!ctx || !this.started) return
    const t = ctx.currentTime
    const film = f.film

    // Fan devri görsel fanla aynı kaynaktan gelir
    this.rpm = f.rpm
    const r = this.rpm / 3000
    this.fanBand.frequency.setTargetAtTime(260 + this.rpm * 0.32, t, 0.05)
    this.fanLow.frequency.setTargetAtTime(900 + this.rpm * 0.9, t, 0.05)
    this.fanGain.gain.setTargetAtTime(Math.pow(Math.max(0, r), 1.6) * 0.085, t, 0.05)
    this.fanLfo.frequency.setTargetAtTime(Math.max(0.5, this.rpm / 60), t, 0.05)
    this.bladeOsc.frequency.setTargetAtTime(Math.max(1, (this.rpm / 60) * 7), t, 0.05)
    this.bladeGain.gain.setTargetAtTime(r * 0.006, t, 0.05)

    if (f.power === 'booting' && f.bootT > 4.55) this.postBeep()
    if (f.power === 'booting' && f.bootT > 2.6 && f.bootT < 4.3 && t > this.seekNext) {
      this.seek()
      this.seekNext = t + 0.04 + Math.random() * 0.16
    }

    // Bölüme göre ortam katmanları
    const on = f.power !== 'off'
    const shutdownFade = film > 6 ? Math.max(0, 1 - (film - 6.15) / 0.6) : 1
    const city = on ? band(film, 1.18, 1.3, 2.9, 3.08) : 0
    const shimmer = on ? band(film, 2.02, 2.18, 2.75, 2.95) : 0
    const wind = on ? band(film, 5.0, 5.12, 5.9, 6.05) : 0
    const cutoff = 180 + band(film, 0.9, 1.3, 5.8, 6.2) * 420 + f.load * 380 + (f.overclock ? 600 : 0)

    this.droneFilter.frequency.setTargetAtTime(cutoff * Math.max(0.35, shutdownFade), t, 0.4)
    const droneLevel = f.power === 'off' ? 0 : f.power === 'booting' ? 0.045 : 0.05
    this.droneGain.gain.setTargetAtTime(droneLevel * shutdownFade, t, 0.5)
    for (const o of this.droneOsc) o.detune.setTargetAtTime(film > 6 ? -1200 * (1 - shutdownFade) : 0, t, 0.6)
    this.cityGain.gain.setTargetAtTime(city * 0.05, t, 0.4)
    this.shimmerGain.gain.setTargetAtTime(shimmer * 0.004, t, 0.6)
    this.windGain.gain.setTargetAtTime(wind * 0.05, t, 0.5)
    this.humGain.gain.setTargetAtTime(f.power === 'off' ? 0.008 : 0.012, t, 0.4)
  }
}

/** a→b arasında 0→1, c→d arasında 1→0 olan yumuşak pencere. */
function band(x: number, a: number, b: number, c: number, d: number) {
  const up = Math.min(1, Math.max(0, (x - a) / (b - a)))
  const down = Math.min(1, Math.max(0, (d - x) / (d - c)))
  return Math.min(up, down)
}

export const sound = new SoundEngine()

import { postCodes } from '@/lib/content'
import { clamp, damp, invLerp, smoothstep } from '@/lib/math'
import { frame, useApp } from '@/lib/store'

/**
 * Makinenin "durumu": LED'ler, ışıklar, fan devri, Q-Code, izlerdeki akım...
 * Hepsi tek yerden, güç durumu + açılış saniyesi + film zamanından hesaplanır.
 * Görseller ve sesler aynı değerleri okur; böylece fan sesi ile fanın dönüşü hep uyumludur.
 */

export { BOOT } from '@/lib/boot'

export const GLOW_GROUPS = ['pwrsw', 'pson', 'power', 'vcore', 'clock', 'ddr', 'pcie', 'm2', 'dmi', 'misc'] as const
export type GlowGroup = (typeof GLOW_GROUPS)[number]

export const sys = {
  /** SB_PWR LED parlaklığı */
  led: 0.4,
  /** güç düğmesi halkası */
  button: 0.3,
  /** basılı tutma ilerlemesi (0..1), arayüzden yazılır */
  hold: 0,
  /** stüdyo ışıkları */
  env: 0,
  rpm: 0,
  qcode: '  ',
  dbg: [0, 0, 0, 0],
  glowAct: new Float32Array(GLOW_GROUPS.length),
  glowHead: new Float32Array(GLOW_GROUPS.length),
  dieGlow: 0,
  xtal: 0,
  /** çekirdeklerin (ilçelerin) yüklenme durumu */
  districts: new Float32Array(9),
  /** ilçe vurgusu (fareyle üzerine gelince) */
  highlight: new Float32Array(9),
  overclock: 0,
}

const g = (name: GlowGroup) => GLOW_GROUPS.indexOf(name)

function pulse(t: number, start: number, dur: number) {
  return (t - start) / dur
}

export function updateSystem(dt: number) {
  const app = useApp.getState()
  const t = frame.time
  const F = frame.film
  const power = app.power
  const bt = frame.bootT
  const breath = 0.5 - 0.5 * Math.cos((t / 3.6) * Math.PI * 2)

  const act = sys.glowAct
  const head = sys.glowHead
  act.fill(0)
  head.fill(-1)

  // Kapanış ilerlemesi (film 6.08 → 6.75)
  const down = power === 'on' ? smoothstep(6.08, 6.75, F) : 0
  const alive = 1 - down

  if (power === 'off') {
    sys.led = 0.18 + 0.82 * breath
    sys.button = 0.25 + 0.35 * breath + sys.hold * 0.8
    sys.env = 0.0
    sys.qcode = '  '
    sys.dbg = [0, 0, 0, 0]
    sys.dieGlow = 0
    sys.xtal = 0
  } else if (power === 'booting') {
    sys.led = 1
    sys.button = 1
    sys.env = smoothstep(0.45, 2.3, bt)
    // Gerçek sıra: düğme → EC → PS_ON# → PSU → PWR_OK → VRM → saat → bellek eğitimi → PCIe
    const seq: [GlowGroup, number, number, number][] = [
      ['pwrsw', 0.0, 0.28, 0],
      ['pson', 0.22, 0.25, 0.08],
      ['power', 0.45, 0.6, 0.3],
      ['vcore', 1.0, 0.45, 0.3],
      ['clock', 1.55, 0.5, 0.55],
      ['ddr', 2.6, 0.5, 0.3],
      ['pcie', 3.55, 0.45, 0.25],
      ['m2', 3.75, 0.45, 0.22],
      ['dmi', 3.3, 0.45, 0.22],
      ['misc', 1.2, 2.0, 0.08],
    ]
    for (const [name, start, dur, steady] of seq) {
      const i = g(name)
      const h = pulse(bt, start, dur)
      if (h < 0) continue
      head[i] = h
      act[i] = h < 1.25 ? 1 : steady
    }
    // DDR eğitimi: tekrar eden desenler
    if (bt > 2.6 && bt < 4.2) {
      head[g('ddr')] = ((bt - 2.6) * 2.6) % 1.3
      act[g('ddr')] = 1
    }
    sys.dieGlow = smoothstep(1.2, 2.6, bt)
    sys.xtal = smoothstep(1.5, 1.8, bt) * (1 - smoothstep(2.9, 3.6, bt) * 0.6)
    const qi = Math.floor(invLerp(1.55, 4.5, bt) * (postCodes.length - 1))
    sys.qcode = bt < 1.55 ? '00' : postCodes[clamp(qi, 0, postCodes.length - 1)]
    sys.dbg = [
      bt > 1.0 && bt < 1.9 ? 1 : 0,
      bt > 1.9 && bt < 4.0 ? 1 : 0,
      bt > 4.0 && bt < 4.3 ? 1 : 0,
      bt > 4.3 && bt < 4.6 ? 1 : 0,
    ]
  } else {
    sys.led = alive > 0.02 ? 1 : 0.18 + 0.82 * breath
    sys.button = 0.75 * alive + (1 - alive) * (0.25 + 0.35 * breath)
    // kapanış bölümünde kart daha loş: servisler duruyor, ışıklar çekiliyor
    sys.env = (1 - down * 0.94) * (F > 3 ? 0.55 : 1)
    sys.qcode = down > 0.45 ? '  ' : down > 0.05 ? '--' : 'AA'
    sys.dbg = [0, 0, 0, 0]
    sys.dieGlow = alive
    sys.xtal = 0.25 * alive
    const steady: [GlowGroup, number][] = [
      ['power', 0.3],
      ['vcore', 0.3],
      ['clock', 0.5],
      ['ddr', 0.32],
      ['pcie', 0.26],
      ['m2', 0.22],
      ['dmi', 0.22],
      ['pson', 0.08],
      ['misc', 0.06],
    ]
    const dimmed = F > 3 ? 0.7 : 1
    for (const [name, v] of steady) act[g(name)] = v * alive * dimmed * (1 + frame.load * 1.5)
  }

  // Fan devri: açılışta tam devir, BIOS fan kontrolü devreye girince sakinleşir; kaydırma hızı = yük
  let target = 0
  if (power === 'booting') target = bt < 0.25 ? 0 : bt < 4.2 ? 2700 : 1150
  else if (power === 'on') target = (1050 + frame.load * 1500 + sys.overclock * 2400) * alive
  const k = target > sys.rpm ? 1.25 : 0.55
  sys.rpm += (target - sys.rpm) * (1 - Math.exp(-k * dt))

  // Çekirdek modüllerinin yüklenmesi (Yetenekler bölümü): ilçeler sırayla aydınlanır
  for (let i = 0; i < 9; i++) {
    const start = i < 6 ? 2.05 + i * 0.035 : i === 6 ? 1.3 : 1.25
    const on = power === 'on' ? smoothstep(start, start + 0.03, F) : 0
    const base = i < 6 ? 0.32 : 0.6
    sys.districts[i] = base + (1 - base) * on
    const hi = app.core === i ? 1 : 0
    sys.highlight[i] = damp(sys.highlight[i], hi, 8, dt)
  }
  sys.overclock = damp(sys.overclock, app.overclock ? 1 : 0, 2.5, dt)
}

import { hops, timeline } from './content'
import { clamp, lerp, smootherstep } from './math'

/**
 * Film zamanı (0..7) ile içerik arasındaki eşlemeler. 3B sahne ve katmanlar aynı fonksiyonları kullanır;
 * böylece analizör imleci ile dmesg satırları, harita uçuşu ile traceroute satırları hep eşzamanlıdır.
 */

/** Deneyim bölümünde analizör imlecinin gösterdiği yıl. */
export function cursorYear(F: number) {
  return lerp(timeline.start, timeline.now, smootherstep(4.1, 4.9, F))
}

/** Yolculuk bölümünde uçuş ilerlemesi: 0 başlangıç, 1..n atlamalar, n+1 bitiş. */
export function flightT(F: number) {
  // Neredeyse doğrusal: atlamalar kaydırmaya eşit aralıklarla yayılsın (uçlarda hafif yumuşama)
  const x = clamp((F - 5.04) / 0.96)
  return lerp(x, smootherstep(0, 1, x), 0.3)
}

export function activeHop(F: number) {
  const t = flightT(F) * (hops.length + 1)
  return clamp(Math.round(t), 0, hops.length)
}

const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export function formatYear(y: number) {
  const year = Math.floor(y)
  const month = clamp(Math.floor((y - year) * 12), 0, 11)
  return { year, month: months[month], short: months[month].slice(0, 3) }
}

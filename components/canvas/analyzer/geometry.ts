import { timeline } from '@/lib/content'

/** Mantık analizörü: zaman ekseni x (yıl başına ~16 birim), kanallar z boyunca. */
export const AN = { x0: -60, x1: 60, high: 1.2 }

export function analyzerX(year: number) {
  return AN.x0 + ((year - timeline.start) / (timeline.end - timeline.start)) * (AN.x1 - AN.x0)
}

export function analyzerYear(x: number) {
  return timeline.start + ((x - AN.x0) / (AN.x1 - AN.x0)) * (timeline.end - timeline.start)
}

/** CLK + 6 kanal; uzaktan yakına. */
export const CHANNEL_GAP = 2.4
export const CHANNEL_Z = Array.from({ length: 8 }, (_, i) => (i - 3.5) * CHANNEL_GAP)
/** kanalların kapladığı bant (zeminde ızgara bu bandın içinde) */
export const CHANNEL_EXTENT = 4 * CHANNEL_GAP
/** yıl etiketlerinin durduğu uzak kenar */
export const YEAR_Z = -(CHANNEL_EXTENT + 1.2)

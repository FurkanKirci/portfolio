'use client'

import { useEffect, useRef } from 'react'
import { onFrame } from '@/lib/loop'

const SEG: Record<string, number[]> = {
  '0': [1, 1, 1, 1, 1, 1, 0], '1': [0, 1, 1, 0, 0, 0, 0], '2': [1, 1, 0, 1, 1, 0, 1], '3': [1, 1, 1, 1, 0, 0, 1],
  '4': [0, 1, 1, 0, 0, 1, 1], '5': [1, 0, 1, 1, 0, 1, 1], '6': [1, 0, 1, 1, 1, 1, 1], '7': [1, 1, 1, 0, 0, 0, 0],
  '8': [1, 1, 1, 1, 1, 1, 1], '9': [1, 1, 1, 1, 0, 1, 1], A: [1, 1, 1, 0, 1, 1, 1], B: [0, 0, 1, 1, 1, 1, 1],
  C: [1, 0, 0, 1, 1, 1, 0], D: [0, 1, 1, 1, 1, 0, 1], E: [1, 0, 0, 1, 1, 1, 1], F: [1, 0, 0, 0, 1, 1, 1],
  '-': [0, 0, 0, 0, 0, 0, 1], ' ': [0, 0, 0, 0, 0, 0, 0],
}

/** Altıgen segment: (cx, cy) merkezli, L uzunluk, T kalınlık; yatay ya da dikey. */
function seg(cx: number, cy: number, L: number, T: number, vertical: boolean) {
  const h = T / 2
  const pts = [
    [-L / 2, 0],
    [-L / 2 + h, -h],
    [L / 2 - h, -h],
    [L / 2, 0],
    [L / 2 - h, h],
    [-L / 2 + h, h],
  ].map(([x, y]) => (vertical ? [cx + y, cy + x] : [cx + x, cy + y]))
  return 'M' + pts.map((p) => p.map((v) => v.toFixed(2)).join(' ')).join('L') + 'Z'
}

// a b c d e f g sırası
const W = 26
const H = 46
const T = 4.6
const SHAPES = [
  seg(W / 2, T / 2, W - 3, T, false),
  seg(W - T / 2, H / 4 + 0.5, H / 2 - 3, T, true),
  seg(W - T / 2, (3 * H) / 4 - 0.5, H / 2 - 3, T, true),
  seg(W / 2, H - T / 2, W - 3, T, false),
  seg(T / 2, (3 * H) / 4 - 0.5, H / 2 - 3, T, true),
  seg(T / 2, H / 4 + 0.5, H / 2 - 3, T, true),
  seg(W / 2, H / 2, W - 3, T, false),
]

/** DOM tarafında iki haneli 7 segment gösterge (karttaki Q-Code'un ikizi). */
export function SevenSegment({ source }: { source: () => string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    let last = ''
    return onFrame(() => {
      const code = source().padEnd(2, ' ').slice(0, 2).toUpperCase()
      if (code === last || !ref.current) return
      last = code
      const paths = ref.current.querySelectorAll('path')
      for (let d = 0; d < 2; d++) {
        const on = SEG[code[d]] ?? SEG[' ']
        for (let s = 0; s < 7; s++) paths[d * 7 + s].setAttribute('data-on', on[s] ? '1' : '0')
      }
    })
  }, [source])
  return (
    <svg ref={ref} width="68" height="54" viewBox="-2 -2 66 52" aria-hidden="true" className="seven">
      {[0, 1].map((d) => (
        <g key={d} transform={`translate(${d * 33 + 3} 0) skewX(-7)`}>
          {SHAPES.map((p, i) => (
            <path key={i} d={p} data-on="0" />
          ))}
        </g>
      ))}
      <style>{`.seven path{fill:#0b131d;transition:fill .08s}.seven path[data-on='1']{fill:#cdeeff;filter:drop-shadow(0 0 4px rgba(127,214,255,.75))}`}</style>
    </svg>
  )
}

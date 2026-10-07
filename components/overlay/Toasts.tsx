'use client'

import { useApp } from '@/lib/store'

/** Klavyeden yazılan komutların ve sistem olaylarının kısa, terminal tarzı çıktıları. */
export function Toasts() {
  const toasts = useApp((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed bottom-[calc(var(--gutter)*0.55+44px)] left-[var(--gutter)] z-[55] flex max-w-[min(520px,calc(100vw-2*var(--gutter)))] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass whitespace-pre-wrap px-4 py-3 t-mono text-[12px] leading-relaxed text-ink"
          style={{ animation: 'toastIn .35s var(--ease-out) both', borderColor: t.tone === 'warn' ? 'rgba(255,154,92,.35)' : t.tone === 'err' ? 'rgba(255,110,110,.4)' : undefined }}
        >
          {t.text}
        </div>
      ))}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  )
}

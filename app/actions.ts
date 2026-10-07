'use server'

import nodemailer from 'nodemailer'
import { headers } from 'next/headers'
import type { SendState } from '@/components/overlay/chapters/Contact'
import { profile } from '@/lib/content'

/**
 * İletişim formu. Gmail için EMAIL_PASSWORD (uygulama şifresi) gerekir; EMAIL_USER boşsa profildeki adres kullanılır.
 * Kullanıcı girdisi e-postaya HTML olarak gömülmeden önce kaçışlanır.
 */

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

// Sunucusuz ortamda kalıcı değil ama art arda gönderimleri yine de yavaşlatır
const recent = new Map<string, number[]>()

export async function sendMessage(_prev: SendState, form: FormData): Promise<SendState> {
  const name = String(form.get('name') ?? '').trim()
  const email = String(form.get('email') ?? '').trim()
  const message = String(form.get('message') ?? '').trim()
  const trap = String(form.get('website') ?? '')
  const startedAt = Number(form.get('t') ?? 0)

  // Bot tuzağı: görünmez alan doldurulmuşsa ya da form insanüstü hızda gönderildiyse sessizce "başarılı" de
  if (trap || (startedAt && Date.now() - startedAt < 2500)) return { ok: true, message: 'ok' }

  if (name.length < 2 || name.length > 80) return { ok: false, message: 'Adını yazar mısın?' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) return { ok: false, message: 'E-posta adresi geçerli görünmüyor.' }
  if (message.length < 5 || message.length > 4000) return { ok: false, message: 'Mesaj 5 ile 4000 karakter arasında olmalı.' }

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'yerel'
  const now = Date.now()
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60_000)
  if (hits.length >= 4) return { ok: false, message: 'Biraz yavaşla: birkaç dakika sonra tekrar dene.' }
  recent.set(ip, [...hits, now])

  const user = process.env.EMAIL_USER || profile.email
  const pass = process.env.EMAIL_PASSWORD
  const to = process.env.EMAIL_TO || user
  if (!pass) {
    console.error('İletişim formu: EMAIL_PASSWORD tanımlı değil.')
    return { ok: false, message: 'Form şu an yapılandırılmamış. Doğrudan e-posta atabilirsin.' }
  }

  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
    await transporter.sendMail({
      from: `"Portfolyo" <${user}>`,
      to,
      replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
      subject: `Portfolyo · ${name}`,
      text: `${name} <${email}>\n\n${message}`,
      html: `<p><strong>${escape(name)}</strong> &lt;${escape(email)}&gt;</p><p style="white-space:pre-wrap">${escape(message)}</p><hr><p style="color:#888;font-size:12px">Portfolyo iletişim formundan gönderildi.</p>`,
    })
    return { ok: true, message: 'ok' }
  } catch (err) {
    console.error('E-posta gönderilemedi:', err)
    return { ok: false, message: 'Gönderilemedi. Doğrudan e-posta atabilirsin.' }
  }
}

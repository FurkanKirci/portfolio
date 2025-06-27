"use server"

import nodemailer from "nodemailer"

export async function sendContactEmail(formData: FormData) {
  try {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const message = formData.get("message") as string

    // Email transporter oluştur (Gmail için)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "furkankirci12@gmail.com", // Gönderen email
        pass: process.env.EMAIL_PASSWORD, // Gmail App Password
      },
    })

    // Email içeriği
    const mailOptions = {
      from: "furkankirci12@gmail.com", // Gönderen
      to: "furkankirci12@gmail.com", // Alıcı (kendine)
      subject: `Portfolio İletişim Formu - ${name}`,
      html: `
        <h2>Yeni İletişim Mesajı</h2>
        <p><strong>Gönderen:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mesaj:</strong></p>
        <p>${message}</p>
        <hr>
        <p><small>Bu mesaj portfolio sitenizden gönderilmiştir.</small></p>
      `,
    }

    // Email gönder
    await transporter.sendMail(mailOptions)

    return { success: true, message: "Mesajınız başarıyla gönderildi!" }
  } catch (error) {
    console.error("Email gönderme hatası:", error)
    return { success: false, message: "Mesaj gönderilirken bir hata oluştu." }
  }
} 
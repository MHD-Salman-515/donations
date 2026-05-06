import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOtpEmail(to, otp) {
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to,
      subject: "رمز التحقق",
      html: `<p>رمز التحقق: <strong>${otp}</strong></p><p>صالح 10 دقائق.</p>`,
    })
  } catch (err) {
    console.error("EMAIL ERROR:", err.message)
    throw err
  }
}
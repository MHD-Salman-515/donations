import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOtpEmail(to, otp) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to,
    subject: "Your verification code",
    html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes. Do not share it with anyone.</p>`,
  })
}

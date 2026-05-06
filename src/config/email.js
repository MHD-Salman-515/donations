import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendOtpEmail(to, otp) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject: "Your verification code",
      html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes. Do not share it with anyone.</p>`,
    })
  } catch (err) {
    console.error("EMAIL ERROR:", err.message, err.code)
    throw err
  }
}

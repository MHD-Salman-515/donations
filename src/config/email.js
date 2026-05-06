import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendOtpEmail(to, otp) {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: "Your verification code",
    html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes. Do not share it with anyone.</p>`,
  })
}

export async function sendOtpEmail(to, otp) {
  const form = new FormData()
  form.append("from", `Verification <mailgun@${process.env.MAILGUN_DOMAIN}>`)
  form.append("to", to)
  form.append("subject", "Your verification code")
  form.append(
    "html",
    `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes. Do not share it with anyone.</p>`
  )

  const credentials = Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString("base64")

  try {
    const res = await fetch(
      `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${credentials}` },
        body: form,
      }
    )

    if (!res.ok) {
      const text = await res.text()
      const err = new Error(`Mailgun error ${res.status}: ${text}`)
      console.error("EMAIL ERROR:", err.message)
      throw err
    }
  } catch (err) {
    if (!err.message.startsWith("Mailgun error")) {
      console.error("EMAIL ERROR:", err.message)
    }
    throw err
  }
}

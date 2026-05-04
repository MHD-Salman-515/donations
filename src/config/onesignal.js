export async function sendPushNotification(userIds, title, message, data = {}) {
  if (!userIds?.length) return

  await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: process.env.ONESIGNAL_APP_ID,
      include_external_user_ids: userIds.map(String),
      contents: { en: message },
      headings: { en: title },
      data,
    }),
  })
}

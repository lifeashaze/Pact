import "server-only"

// Sends through Resend's HTTP API. RESEND_API_KEY and EMAIL_FROM (e.g. "Pact <invites@yourdomain.com>")
// come from the env; without them nothing is sent and the caller says so
export type SendResult = { sent: true } | { sent: false; reason: string }

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

export async function sendEmail(mail: {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from) return { sent: false, reason: "Email isn't set up (RESEND_API_KEY and EMAIL_FROM)" }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text, reply_to: mail.replyTo }),
    })
    if (res.ok) return { sent: true }
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    return { sent: false, reason: body?.message ?? `Resend said ${res.status}` }
  } catch {
    return { sent: false, reason: "Couldn't reach Resend" }
  }
}

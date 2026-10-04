"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { RiCheckLine, RiMailSendLine } from "@remixicon/react"

import type { InviteRow } from "@/lib/invites"

const when = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

type Notice = { tone: "ok" | "error"; text: string }

type CreateResponse = {
  invites: InviteRow[]
  failed: { email: string; reason: string }[]
  emailed: string[]
  approved: string[]
  invalid: string[]
  error?: string
}

export function InviteBoard({
  initial,
  emailReady,
}: {
  initial: InviteRow[]
  emailReady: boolean
}) {
  const [invites, setInvites] = React.useState(initial)
  const [draft, setDraft] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<Notice | null>(null)

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    setNotice(null)
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emails: draft }),
      })
      const body = (await res.json().catch(() => null)) as CreateResponse | null
      if (!res.ok || !body)
        throw new Error(body?.error ?? "Something went wrong")

      setInvites((list) => [
        ...body.invites,
        ...list.filter((i) => !body.invites.some((n) => n.email === i.email)),
      ])
      setDraft("")
      setNotice(summarise(body, emailReady))
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      })
    } finally {
      setSending(false)
    }
  }

  async function act(email: string, method: "PATCH" | "DELETE") {
    setBusy(email)
    setNotice(null)
    try {
      const res = await fetch("/api/admin/invites", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const body = (await res.json().catch(() => null)) as {
        invite?: InviteRow
        error?: string
      } | null
      if (!res.ok) throw new Error(body?.error ?? "Something went wrong")
      if (method === "DELETE") {
        setInvites((list) => list.filter((i) => i.email !== email))
        setNotice({ tone: "ok", text: `Took back the invite for ${email}.` })
      } else {
        setInvites((list) =>
          list.map((i) => (i.email === email && body?.invite ? body.invite : i))
        )
        setNotice({ tone: "ok", text: `Sent it again to ${email}.` })
      }
    } catch (err) {
      setNotice({
        tone: "error",
        text: `${email}: ${err instanceof Error ? err.message : "Something went wrong"}`,
      })
    } finally {
      setBusy(null)
    }
  }

  const joined = invites.filter((i) => i.acceptedAt).length

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_1fr] xl:grid-cols-[minmax(0,26rem)_1fr]">
      <form
        onSubmit={invite}
        className="grid gap-3 rounded-3xl bg-card p-4 sm:p-5 lg:sticky lg:top-10"
      >
        <label htmlFor="invite-emails" className="font-semibold">
          Google emails
        </label>
        <textarea
          id="invite-emails"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
              e.currentTarget.form?.requestSubmit()
          }}
          rows={4}
          autoComplete="off"
          spellCheck={false}
          placeholder={"sam@gmail.com\nalex@company.com"}
          aria-describedby="invite-help"
          className="min-h-28 resize-y rounded-2xl bg-muted px-4 py-3 text-base outline-none placeholder:text-muted-foreground/70 focus-visible:outline-2 focus-visible:outline-ring"
        />
        <p id="invite-help" className="text-sm text-muted-foreground">
          One or many, separated by commas or new lines. Use the address they
          sign in to Google with.
        </p>
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] disabled:opacity-50"
        >
          <RiMailSendLine className="size-4.5" />
          {sending ? "Inviting" : emailReady ? "Send invites" : "Add invites"}
        </button>
        {!emailReady && (
          <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            Email isn&apos;t set up yet, so nobody gets a message. Invites still
            work: tell them to sign in with Google. Set{" "}
            <code className="font-mono text-xs">RESEND_API_KEY</code> and{" "}
            <code className="font-mono text-xs">EMAIL_FROM</code> to send
            emails.
          </p>
        )}
      </form>

      <section
        aria-labelledby="invite-list"
        className="rounded-3xl bg-card p-3 sm:p-4 lg:p-5"
      >
        <div className="flex items-baseline justify-between gap-3 px-3 pt-1">
          <h2 id="invite-list" className="font-semibold">
            Invited
          </h2>
          {invites.length > 0 && (
            <p className="text-sm text-muted-foreground tabular-nums">
              {joined} of {invites.length} joined
            </p>
          )}
        </div>

        <p aria-live="polite" className="mx-3 mt-3 empty:hidden">
          {notice && (
            <span
              className={
                notice.tone === "error"
                  ? "block rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  : "block rounded-xl bg-muted px-4 py-3 text-sm"
              }
            >
              {notice.text}
            </span>
          )}
        </p>

        {invites.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">
            No invites yet. Anyone you add shows up here.
          </p>
        ) : (
          <ul className="mt-2 grid">
            <AnimatePresence initial={false}>
              {invites.map((i) => (
                <motion.li
                  key={i.email}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-3 py-3 transition-colors focus-within:bg-muted/60 hover:bg-muted/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold" title={i.email}>
                      {i.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <Status invite={i} />
                    </p>
                  </div>
                  <div className="flex gap-2 max-sm:w-full">
                    {!i.acceptedAt && emailReady && (
                      <button
                        type="button"
                        disabled={busy === i.email}
                        onClick={() => act(i.email, "PATCH")}
                        className="h-9 rounded-full bg-muted px-4 text-sm font-semibold transition-[transform,background-color] hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] disabled:opacity-60 max-sm:flex-1"
                      >
                        {i.emailedAt ? "Resend" : "Send email"}
                      </button>
                    )}
                    {!i.acceptedAt && (
                      <button
                        type="button"
                        disabled={busy === i.email}
                        onClick={() => act(i.email, "DELETE")}
                        aria-label={`Take back the invite for ${i.email}`}
                        className="h-9 rounded-full px-4 text-sm font-semibold text-muted-foreground transition-[transform,color] hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] disabled:opacity-60 max-sm:flex-1"
                      >
                        Take back
                      </button>
                    )}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </div>
  )
}

function Status({ invite: i }: { invite: InviteRow }) {
  if (i.acceptedAt)
    return (
      <span className="inline-flex items-center gap-1 font-medium text-foreground">
        <RiCheckLine className="size-4" aria-hidden />
        Joined {when.format(new Date(i.acceptedAt))}
      </span>
    )
  if (i.emailedAt) return <>Emailed {when.format(new Date(i.emailedAt))}</>
  return <>Invited {when.format(new Date(i.createdAt))}, no email sent</>
}

function summarise(body: CreateResponse, emailReady: boolean): Notice {
  const parts: string[] = []
  const n = body.invites.length
  const emailed = body.emailed.length
  if (emailReady && emailed > 0)
    parts.push(`Emailed ${emailed} ${emailed === 1 ? "person" : "people"}.`)
  if (!emailReady) parts.push(`Added ${n}. They can sign in with Google now.`)
  if (body.approved.length)
    parts.push(
      `Let in ${body.approved.join(", ")}, who ${body.approved.length === 1 ? "was" : "were"} already waiting.`
    )
  if (emailReady && body.failed.length)
    parts.push(
      `Couldn't email ${body.failed.map((f) => `${f.email} (${f.reason})`).join(", ")}. The invite still works.`
    )
  if (body.invalid.length)
    parts.push(`Skipped ${body.invalid.join(", ")}, not emails.`)
  return {
    tone: emailReady && body.failed.length ? "error" : "ok",
    text: parts.join(" "),
  }
}

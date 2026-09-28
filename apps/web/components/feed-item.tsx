"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"

import { cn } from "@workspace/ui/lib/utils"
import { Avatar, hueTint } from "@/components/bits"
import { useSquad, useSeason } from "@/components/squad-store"
import { type FeedItem, REACTIONS } from "@/lib/feed"

export function useDayName() {
  const { TODAY, weekdayDate } = useSeason()
  return (day: number) => (day === TODAY ? "Today" : day === TODAY - 1 ? "Yesterday" : weekdayDate(day))
}

export function FeedItemView({ item, compact = false }: { item: FeedItem; compact?: boolean }) {
  const { TODAY } = useSeason()
  const dayName = useDayName()
  const { toggleReaction, addComment, you, getMember } = useSquad()
  const member = getMember(item.memberId)!
  const name = member.isYou ? "You" : member.name

  return (
    <article className="flex gap-3">
      <Link href={`/squad/${member.id}`} className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <Avatar member={member} size={40} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{name}</span>{" "}
          {item.day >= TODAY - 1 ? dayName(item.day).toLowerCase() : `on ${dayName(item.day)}`} at {item.time}
        </p>
        <p className="mt-0.5 font-display text-xl leading-snug font-semibold">{item.title}</p>
        {item.detail && <p className="text-sm text-muted-foreground">{item.detail}</p>}

        {!compact && item.comments.length > 0 && (
          <ul className="mt-3 grid gap-1.5">
            {item.comments.map((c) => {
              const author = getMember(c.memberId)
              if (!author) return null
              return (
                <li key={c.id} className="w-fit rounded-2xl rounded-tl-md px-3 py-1.5 text-sm" style={{ background: hueTint(author.hue, 12) }}>
                  <span className="font-semibold">{author.name}</span> {c.text}
                </li>
              )
            })}
          </ul>
        )}

        {!compact && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {REACTIONS.map((emoji) => {
              const by = item.reactions[emoji] ?? []
              const mine = by.includes(you.id)
              if (!by.length && item.memberId === you.id) return null
              return (
                <motion.button
                  key={emoji}
                  type="button"
                  aria-pressed={mine}
                  aria-label={`React ${emoji}${by.length ? `, ${by.length} so far` : ""}`}
                  onClick={() => toggleReaction(item.id, emoji)}
                  whileTap={{ scale: 0.85 }}
                  animate={mine ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "flex h-8 items-center gap-1 rounded-full border px-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    mine ? "border-foreground bg-muted" : "border-border hover:bg-muted",
                    !by.length && "opacity-60 hover:opacity-100"
                  )}
                >
                  <span>{emoji}</span>
                  <AnimatePresence mode="popLayout" initial={false}>
                    {by.length > 0 && (
                      <motion.span
                        key={by.length}
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -8, opacity: 0 }}
                        className="tabular-nums"
                      >
                        {by.length}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )
            })}
          </div>
        )}
        {!compact && <CommentBox onSend={(text) => addComment(item.id, text)} />}
      </div>
    </article>
  )
}

// A one-line reply box that grows a send button once there's something to send
function CommentBox({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = React.useState("")
  const id = React.useId()
  return (
    <form
      className="mt-3 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        onSend(text)
        setText("")
      }}
    >
      <label htmlFor={id} className="sr-only">
        Add a comment
      </label>
      <input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={280}
        placeholder="Say something"
        className="h-9 min-w-0 flex-1 rounded-full bg-muted px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
      />
      <AnimatePresence>
        {text.trim() && (
          <motion.button
            type="submit"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="h-9 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Send
          </motion.button>
        )}
      </AnimatePresence>
    </form>
  )
}

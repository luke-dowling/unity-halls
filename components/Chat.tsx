"use client"

import { useEffect, useRef, useState } from "react"

export interface ChatMessage {
  id: string
  characterName?: string | null
  shadowColor?: string | null
  content: string
  createdAt: string
}

interface ChatProps {
  messages: ChatMessage[]
  onSend: (content: string) => void
}

export default function Chat({ messages, onSend }: ChatProps) {
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    onSend(trimmed)
    setInput("")
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-stone-500 text-xs text-center pt-4">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-0.5">
            <div className="flex items-baseline gap-2">
              <span
                className="text-xs font-semibold"
                style={{ color: msg.shadowColor ?? "#a8a29e" }}
              >
                {msg.characterName ?? "Unknown"}
              </span>
              <span className="text-xs text-stone-600">{formatTime(msg.createdAt)}</span>
            </div>
            <p className="text-sm text-stone-200 leading-snug break-words">{msg.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex-none border-t border-stone-800 p-3 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something…"
          maxLength={500}
          className="flex-1 bg-stone-800 text-stone-100 placeholder-stone-500 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-semibold text-sm rounded transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { Loader2, MessageSquare } from 'lucide-react'

import type { Citation, ChatMessage } from '../../lib/api'
import CitationChip from './CitationChip'

function renderContent(text: string, citations: Citation[] | null) {
  if (!citations?.length) return text

  const referenced = new Set<number>()
  const parts = text.split(/(\[\d+\])/g)
  const rendered = parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/)
    if (match) {
      const idx = parseInt(match[1], 10)
      const citation = citations[idx - 1]
      if (citation) {
        referenced.add(idx)
        return <CitationChip key={i} index={idx} citation={citation} />
      }
    }
    return <span key={i}>{part}</span>
  })

  const unreferenced = citations
    .map((c, i) => ({ citation: c, index: i + 1 }))
    .filter(({ index }) => !referenced.has(index))

  if (unreferenced.length === 0) return rendered

  return (
    <>
      {rendered}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {unreferenced.map(({ citation, index }) => (
          <CitationChip key={index} index={index} citation={citation} />
        ))}
      </div>
    </>
  )
}

export default function Messages({
  messages,
  thinking,
}: {
  messages: ChatMessage[]
  thinking: boolean
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  if (messages.length === 0 && !thinking) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
          <MessageSquare className="h-6 w-6 text-zinc-500" />
        </div>
        <div>
          <p className="text-lg font-medium text-zinc-300">Ask anything</p>
          <p className="mt-1 text-sm text-zinc-500">
            Questions are answered from the video transcript, with citations
            linking to the exact moment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {messages.map((msg) => {
          const isUser = msg.role === 'user'
          return (
            <div
              key={msg.id}
              className={isUser ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={
                  isUser
                    ? 'max-w-[80%] rounded-2xl bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100'
                    : 'max-w-[85%] text-sm leading-relaxed text-zinc-200'
                }
              >
                {isUser ? (
                  msg.content
                ) : (
                  <div className="space-y-1.5">
                    {renderContent(msg.content, msg.citations)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {thinking && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

import { Loader2 } from 'lucide-react'

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
  if (messages.length === 0 && !thinking) return null

  return (
    <>
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
    </>
  )
}

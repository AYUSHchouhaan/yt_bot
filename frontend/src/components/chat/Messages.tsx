import { Loader2 } from 'lucide-react'

import type { Citation, ChatMessage } from '../../lib/api'
import CitationChip from './CitationChip'

function renderContent(text: string, citations: Citation[] | null) {
  if (!citations?.length) return text

  const referenced = new Set<number>()
  const parts = text.split(/(\[\d+\])/g)
  const rendered = parts.map((part, index) => {
    const match = part.match(/^\[(\d+)\]$/)
    if (match) {
      const citationIndex = parseInt(match[1], 10)
      const citation = citations[citationIndex - 1]
      if (citation) {
        referenced.add(citationIndex)
        return <CitationChip key={index} index={citationIndex} citation={citation} />
      }
    }
    return <span key={index}>{part}</span>
  })

  const unreferenced = citations
    .map((citation, index) => ({ citation, index: index + 1 }))
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
      {messages.map((message) => {
        const isUser = message.role === 'user'
        return (
          <div
            key={message.id}
            data-message-id={message.id}
            className={isUser ? 'flex justify-end' : 'flex justify-start'}
          >
            <div className={isUser ? 'message--user' : 'message--assistant'}>
              {isUser ? (
                message.content
              ) : (
                <div className="space-y-1.5">
                  {renderContent(message.content, message.citations)}
                </div>
              )}
            </div>
          </div>
        )
      })}
      {thinking && (
        <div className="flex justify-start">
          <p className="thinking" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Thinking through your library…
          </p>
        </div>
      )}
    </>
  )
}

import { useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, MessageSquare } from 'lucide-react'

import Messages from '../components/chat/Messages'
import WelcomeScreen from '../components/chat/WelcomeScreen'
import { useChatSession } from '../components/chat/chatSessionStore'
import { Button } from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

export default function Chat() {
  const { activeChatId, messages, thinking, loadingChat, send } = useChatSession()
  const [showScrollButton, setShowScrollButton] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  function scrollToLatest() {
    const element = scrollRef.current
    if (!element) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const latest = messages[messages.length - 1]
    if (latest?.role === 'user') {
      const latestMessage = element.querySelector<HTMLElement>(
        `[data-message-id="${latest.id}"]`,
      )
      latestMessage?.scrollIntoView({
        block: 'start',
        behavior: reducedMotion ? 'auto' : 'smooth',
      })
      return
    }

    element.scrollTo({
      top: element.scrollHeight,
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }

  useLayoutEffect(scrollToLatest, [messages, thinking])

  function handleScroll() {
    const element = scrollRef.current
    if (!element) return
    setShowScrollButton(element.scrollHeight - element.scrollTop - element.clientHeight > 300)
  }

  const empty = !loadingChat && messages.length === 0 && !thinking
  const welcome = empty && activeChatId === null

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto"
        style={{ scrollbarGutter: 'stable' }}
      >
        {loadingChat && messages.length === 0 ? (
          <div className="mx-auto max-w-3xl space-y-8 px-4 pb-10 pt-16" role="status" aria-label="Loading chat">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className={item % 2 === 0 ? 'ml-auto w-3/4 space-y-2' : 'w-5/6 space-y-2'}
                aria-hidden="true"
              >
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : welcome ? (
          <WelcomeScreen onSuggestion={send} />
        ) : empty ? (
          <div className="flex min-h-full items-center justify-center pb-10">
            <EmptyState
              icon={MessageSquare}
              headingLevel={1}
              title="Start a new conversation"
              description="Ask anything about an ingested video, a playlist, or your whole library."
              reassurance="Ask anything. We’ll show the receipts."
            />
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-10 px-4 pb-10 pt-10">
            <Messages messages={messages} thinking={thinking} />
          </div>
        )}
      </div>

      {showScrollButton && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
          <Button variant="ghost" size="sm" onClick={scrollToLatest} className="scroll-pill">
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
            Scroll to bottom
          </Button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Loader2, MessageSquare } from 'lucide-react'

import ChatInput from '../components/chat/ChatInput'
import Messages from '../components/chat/Messages'
import ScopeSelector from '../components/chat/ScopeSelector'
import { api, type ChatMessage, type Scope } from '../lib/api'
import { ApiError } from '../lib/http'
import { newChatId } from '../lib/ids'

interface RouterState {
  pendingMessage?: string
  scope?: Scope
  notice?: string
}

function parseScope(searchParams: URLSearchParams): Scope {
  const kind = searchParams.get('scope')
  const id = searchParams.get('id')
  if (kind === 'video' || kind === 'playlist') {
    return { kind, id: id ? Number(id) : null }
  }
  return { kind: 'library' }
}

export default function Chat() {
  const { chatId } = useParams<{ chatId: string }>()
  const isNew = chatId === undefined
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingChat, setLoadingChat] = useState(false)
  const [scope, setScope] = useState<Scope>(() => parseScope(searchParams))
  const [showScrollButton, setShowScrollButton] = useState(false)

  const pendingRef = useRef<{ message: string; retried: boolean } | null>(null)
  const firedRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const state = location.state as RouterState | null

    if (!chatId) {
      setMessages([])
      setThinking(false)
      setError(state?.notice ?? null)
      setScope(parseScope(searchParams))
      return
    }

    // A pending message means the chat row doesn't exist yet — send it
    // instead of hydrating (getChat would 404 on an uncommitted slug).
    const pending = pendingRef.current
    pendingRef.current = null
    const pendingMessage = pending?.message ?? state?.pendingMessage
    if (pendingMessage) {
      const key = `${chatId}:${pendingMessage}`
      if (firedRef.current !== key) {
        firedRef.current = key
        void fire(pendingMessage, chatId, pending ? !pending.retried : true)
      }
      return
    }

    let active = true
    setLoadingChat(true)
    setError(null)
    api
      .getChat(chatId)
      .then((chat) => {
        if (!active) return
        setMessages(chat.messages)
        if (chat.video_id) {
          setScope({ kind: 'video', id: chat.video_id })
        } else if (chat.playlist_id) {
          setScope({ kind: 'playlist', id: chat.playlist_id })
        } else {
          setScope({ kind: 'library' })
        }
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 404) {
          navigate('/c/new', {
            replace: true,
            state: { notice: "Chat wasn't created — try again." },
          })
          return
        }
        setError('Failed to load chat')
      })
      .finally(() => {
        if (active) setLoadingChat(false)
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, searchParams])

  async function fire(
    message: string,
    slug: string,
    allowCollisionRetry: boolean,
  ) {
    setError(null)
    setThinking(true)

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      citations: null,
    }
    setMessages((prev) => [...prev, userMessage])

    try {
      const res = await api.sendChat({ message, chat_id: slug, scope })
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: res.answer,
          citations: res.citations,
        },
      ])
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && allowCollisionRetry) {
        // Slug collision: drop the bubble (re-added on retry), regenerate
        // and retry once from the new URL.
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
        const id = newChatId()
        pendingRef.current = { message, retried: true }
        navigate(`/c/${id}`, {
          replace: true,
          state: { pendingMessage: message, scope },
        })
        return
      }
      // The user message is already committed server-side — keep the bubble.
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setThinking(false)
    }
  }

  function handleSend(text: string) {
    if (isNew) {
      const id = newChatId()
      pendingRef.current = { message: text, retried: false }
      navigate(`/c/${id}`, {
        state: { pendingMessage: text, scope },
      })
      return
    }
    void fire(text, chatId, false)
  }

  function handleScopeChange(next: Scope) {
    if (next.kind === scope.kind && next.id === scope.id) return
    navigate(`/c/new?scope=${next.kind}${next.id ? `&id=${next.id}` : ''}`)
  }

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    setShowScrollButton(el.scrollHeight - el.scrollTop - el.clientHeight > 300)
  }

  function scrollToBottom() {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, thinking])

  const empty = !loadingChat && messages.length === 0 && !thinking

  return (
    <div className="relative flex h-full min-w-0 flex-col">
      <div className="relative min-h-0 flex-1">
        {/* Message scroll region — same centerline as the input dock */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto"
          style={{ scrollbarGutter: 'stable' }}
        >
          {loadingChat && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
            </div>
          ) : empty ? (
            <div className="flex min-h-full items-center justify-center pb-48">
              <div className="max-w-md px-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                  <MessageSquare className="h-6 w-6 text-zinc-500" />
                </div>
                <h1 className="mt-4 text-lg font-medium text-zinc-300">
                  New chat
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Ask anything about an ingested video or playlist.
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-10 px-4 pb-48 pt-10">
              <Messages messages={messages} thinking={thinking} />
            </div>
          )}
        </div>

        {/* Scroll-to-bottom pill */}
        {showScrollButton && (
          <div className="pointer-events-none absolute inset-x-0 bottom-44 z-20 flex justify-center">
            <button
              type="button"
              onClick={scrollToBottom}
              className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-300 shadow-lg ring-1 ring-zinc-700 transition-colors hover:bg-zinc-700"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Scroll to bottom
            </button>
          </div>
        )}

        {/* Input dock — pinned to the bottom, same max-w-3xl centerline */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent px-4 pb-4 pt-8">
          <div className="mx-auto max-w-3xl space-y-2">
            {error && (
              <p className="text-center text-sm text-red-400">{error}</p>
            )}
            <ScopeSelector value={scope} onChange={handleScopeChange} />
            <ChatInput onSend={handleSend} disabled={thinking} />
          </div>
        </div>
      </div>
    </div>
  )
}

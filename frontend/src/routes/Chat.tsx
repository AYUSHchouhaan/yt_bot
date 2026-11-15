import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Menu, X } from 'lucide-react'

import ChatInput from '../components/chat/ChatInput'
import Messages from '../components/chat/Messages'
import ScopeSelector from '../components/chat/ScopeSelector'
import Sidebar from '../components/chat/Sidebar'
import { api, type ChatMessage, type Scope } from '../lib/api'

export default function Chat() {
  const { chatId } = useParams<{ chatId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const isNew = chatId === 'new'

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingChat, setLoadingChat] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [scope, setScope] = useState<Scope>(() => {
    const kind = searchParams.get('scope')
    const id = searchParams.get('id')
    if (kind === 'video' || kind === 'playlist') {
      return { kind, id: id ? Number(id) : null }
    }
    return { kind: 'library' }
  })

  useEffect(() => {
    if (isNew) {
      setMessages([])
      setError(null)
      const kind = searchParams.get('scope')
      const id = searchParams.get('id')
      if (kind === 'video' || kind === 'playlist') {
        setScope({ kind, id: id ? Number(id) : null })
      } else {
        setScope({ kind: 'library' })
      }
      return
    }

    let active = true
    setLoadingChat(true)
    setError(null)
    api
      .getChat(Number(chatId))
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
      .catch(() => {
        if (!active) return
        setError('Failed to load chat')
      })
      .finally(() => {
        if (active) setLoadingChat(false)
      })

    return () => {
      active = false
    }
  }, [chatId, isNew, searchParams])

  async function handleSend(text: string) {
    setError(null)
    setThinking(true)

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      citations: null,
    }
    setMessages((prev) => [...prev, userMessage])

    try {
      const res = await api.sendChat({
        message: text,
        chat_id: isNew ? undefined : Number(chatId),
        scope,
      })

      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.answer,
        citations: res.citations,
      }
      setMessages((prev) => [...prev, assistantMessage])

      if (isNew) {
        queryClient.invalidateQueries({ queryKey: ['chats'] })
        navigate(`/c/${res.chat_id}`, { replace: true })
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setThinking(false)
    }
  }

  function handleScopeChange(next: Scope) {
    if (next.kind === scope.kind && next.id === scope.id) return
    navigate(`/c/new?scope=${next.kind}${next.id ? `&id=${next.id}` : ''}`)
  }

  function handleNewChat() {
    navigate('/c/new')
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar onNewChat={handleNewChat} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar onNewChat={handleNewChat} />
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Chat main */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="flex-1 truncate text-sm font-medium text-zinc-300">
            {isNew ? 'New chat' : messages[0]?.content ?? 'Chat'}
          </h1>
        </header>

        {loadingChat && messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
          </div>
        ) : (
          <Messages messages={messages} thinking={thinking} />
        )}

        {error && (
          <div className="px-4 py-2 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="border-t border-zinc-800 px-4 py-3">
          <div className="mx-auto max-w-3xl space-y-2">
            <ScopeSelector value={scope} onChange={handleScopeChange} />
            <ChatInput onSend={handleSend} disabled={thinking} />
          </div>
        </div>
      </div>
    </div>
  )
}

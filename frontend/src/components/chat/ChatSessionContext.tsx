import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

import { api, type ChatMessage, type Scope } from '../../lib/api'
import { ApiError } from '../../lib/http'
import { newChatId } from '../../lib/ids'
import {
  ChatSessionContext,
  type ChatSessionContextValue,
} from './chatSessionStore'

interface ChatState {
  activeChatId: string | null
  messages: ChatMessage[]
  thinking: boolean
  loadingChat: boolean
  error: string | null
  scope: Scope
  hydratedChatId: string | null
}

type ChatAction =
  | { type: 'chatReset'; scope: Scope; error?: string | null }
  | { type: 'newChatStarted'; chatId: string; message: ChatMessage; scope: Scope }
  | { type: 'messageSent'; message: ChatMessage }
  | { type: 'assistantAppended'; message: ChatMessage }
  | { type: 'sendFailed'; error: string }
  | { type: 'collisionRetry'; chatId: string }
  | { type: 'chatLoading'; chatId: string }
  | { type: 'chatLoaded'; chatId: string; messages: ChatMessage[]; scope: Scope }
  | { type: 'loadFailed'; error: string }

function parseScope(searchParams: URLSearchParams): Scope {
  const kind = searchParams.get('scope')
  const id = searchParams.get('id')
  if (kind === 'video' || kind === 'playlist') {
    return { kind, id: id ? Number(id) : null }
  }
  return { kind: 'library' }
}

function sameScope(left: Scope, right: Scope): boolean {
  return left.kind === right.kind && left.id === right.id
}

function createUserMessage(text: string): ChatMessage {
  return {
    id: Date.now(),
    role: 'user',
    content: text,
    citations: null,
  }
}

function createAssistantMessage(answer: string, citations: ChatMessage['citations']): ChatMessage {
  return {
    id: Date.now() + 1,
    role: 'assistant',
    content: answer,
    citations,
  }
}

function reducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'chatReset':
      return {
        activeChatId: null,
        messages: [],
        thinking: false,
        loadingChat: false,
        error: action.error ?? null,
        scope: action.scope,
        hydratedChatId: null,
      }

    case 'newChatStarted':
      return {
        activeChatId: action.chatId,
        messages: [action.message],
        thinking: true,
        loadingChat: false,
        error: null,
        scope: action.scope,
        hydratedChatId: null,
      }

    case 'messageSent':
      return {
        ...state,
        messages: [...state.messages, action.message],
        thinking: true,
        error: null,
      }

    case 'assistantAppended':
      return {
        ...state,
        messages: [...state.messages, action.message],
        thinking: false,
      }

    case 'sendFailed':
      return { ...state, thinking: false, error: action.error }

    case 'collisionRetry':
      return {
        ...state,
        activeChatId: action.chatId,
        hydratedChatId: null,
        error: null,
        thinking: true,
      }

    case 'chatLoading':
      return {
        activeChatId: action.chatId,
        messages: [],
        thinking: false,
        loadingChat: true,
        error: null,
        scope: state.scope,
        hydratedChatId: null,
      }

    case 'chatLoaded':
      return {
        activeChatId: action.chatId,
        messages: action.messages,
        thinking: false,
        loadingChat: false,
        error: null,
        scope: action.scope,
        hydratedChatId: action.chatId,
      }

    case 'loadFailed':
      return { ...state, loadingChat: false, error: action.error }
  }
}

async function requestChat(
  message: string,
  chatId: string,
  scope: Scope,
): Promise<
  | { ok: true; answer: string; citations: ChatMessage['citations'] }
  | { ok: false; error: unknown }
> {
  try {
    const response = await api.sendChat({
      message,
      chat_id: chatId,
      scope,
    })
    return {
      ok: true,
      answer: response.answer,
      citations: response.citations,
    }
  } catch (error) {
    return { ok: false, error }
  }
}

export function ChatSessionProvider({ children }: { children: ReactNode }) {
  const { chatId } = useParams<{ chatId: string }>()
  const routeChatId = !chatId || chatId === 'new' ? null : chatId
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [state, dispatch] = useReducer(reducer, {
    activeChatId: null,
    messages: [],
    thinking: false,
    loadingChat: false,
    error: null,
    scope: parseScope(searchParams),
    hydratedChatId: null,
  })

  const sequenceRef = useRef(0)

  const resetChat = useCallback((scope: Scope, error?: string | null) => {
    sequenceRef.current += 1
    dispatch({ type: 'chatReset', scope, error })
  }, [])

  const loadChat = useCallback(async (targetChatId: string) => {
    const sequence = ++sequenceRef.current
    dispatch({ type: 'chatLoading', chatId: targetChatId })

    try {
      const chat = await api.getChat(targetChatId)
      if (sequenceRef.current !== sequence) return

      const scope: Scope = chat.video_id
        ? { kind: 'video', id: chat.video_id }
        : chat.playlist_id
          ? { kind: 'playlist', id: chat.playlist_id }
          : { kind: 'library' }

      dispatch({
        type: 'chatLoaded',
        chatId: targetChatId,
        messages: chat.messages,
        scope,
      })
    } catch (error) {
      if (sequenceRef.current !== sequence) return

      if (error instanceof ApiError && error.status === 404) {
        resetChat(
          { kind: 'library' },
          "Chat wasn't created. Try again.",
        )
        navigate('/c/new', { replace: true })
        return
      }

      dispatch({
        type: 'loadFailed',
        error: 'Failed to load chat',
      })
    }
  }, [navigate, resetChat])

  const runAnswer = useCallback(async (
    message: string,
    chatId: string,
    scope: Scope,
    allowCollisionRetry: boolean,
  ) => {
    const sequence = ++sequenceRef.current
    let currentChatId = chatId
    let canRetry = allowCollisionRetry

    while (true) {
      const result = await requestChat(message, currentChatId, scope)
      if (sequenceRef.current !== sequence) return

      if (result.ok) {
        dispatch({
          type: 'assistantAppended',
          message: createAssistantMessage(result.answer, result.citations),
        })
        queryClient.invalidateQueries({ queryKey: ['chats'] })
        return
      }

      if (result.error instanceof ApiError && result.error.status === 409 && canRetry) {
        currentChatId = newChatId()
        canRetry = false
        dispatch({ type: 'collisionRetry', chatId: currentChatId })
        navigate(`/c/${currentChatId}`, { replace: true })
        continue
      }

      dispatch({
        type: 'sendFailed',
        error: result.error instanceof Error
          ? result.error.message
          : 'Something went wrong. Please try again.',
      })
      return
    }
  }, [navigate, queryClient])

  const send = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed || state.thinking) return

    const message = createUserMessage(trimmed)

    if (state.activeChatId) {
      dispatch({ type: 'messageSent', message })
      void runAnswer(trimmed, state.activeChatId, state.scope, false)
      return
    }

    const chatId = newChatId()
    dispatch({
      type: 'newChatStarted',
      chatId,
      message,
      scope: state.scope,
    })
    navigate(`/c/${chatId}`)
    void runAnswer(trimmed, chatId, state.scope, true)
  }, [navigate, runAnswer, state.activeChatId, state.scope, state.thinking])

  const openChat = useCallback((targetChatId: string) => {
    if (state.activeChatId === targetChatId) return
    navigate(`/c/${targetChatId}`)
    void loadChat(targetChatId)
  }, [loadChat, navigate, state.activeChatId])

  const openNewChat = useCallback(() => {
    resetChat({ kind: 'library' })
    navigate('/c/new')
  }, [navigate, resetChat])

  const changeScope = useCallback((nextScope: Scope) => {
    if (sameScope(state.scope, nextScope)) return

    const params = new URLSearchParams()
    params.set('scope', nextScope.kind)
    if (nextScope.id != null) params.set('id', String(nextScope.id))

    resetChat(nextScope)
    navigate(`/c/new?${params.toString()}`)
  }, [navigate, resetChat, state.scope])

  useEffect(() => {
    const routeScope = parseScope(searchParams)

    if (!routeChatId) {
      const shouldReset =
        state.activeChatId !== null ||
        !sameScope(state.scope, routeScope) ||
        state.messages.length > 0 ||
        state.thinking ||
        state.loadingChat

      if (shouldReset) resetChat(routeScope)
      return
    }

    if (state.activeChatId === routeChatId) return
    void loadChat(routeChatId)
  }, [
    loadChat,
    resetChat,
    routeChatId,
    searchParams,
    state.activeChatId,
    state.loadingChat,
    state.messages.length,
    state.scope,
    state.thinking,
  ])

  const value = useMemo<ChatSessionContextValue>(() => ({
    activeChatId: state.activeChatId,
    messages: state.messages,
    thinking: state.thinking,
    loadingChat: state.loadingChat,
    scope: state.scope,
    error: state.error,
    send,
    openChat,
    openNewChat,
    changeScope,
  }), [
    changeScope,
    openChat,
    openNewChat,
    send,
    state.activeChatId,
    state.error,
    state.loadingChat,
    state.messages,
    state.scope,
    state.thinking,
  ])

  return (
    <ChatSessionContext.Provider value={value}>
      {children}
    </ChatSessionContext.Provider>
  )
}

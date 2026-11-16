import { createContext, useContext } from 'react'

import type { ChatMessage, Scope } from '../../lib/api'

export interface ChatSessionContextValue {
  activeChatId: string | null
  messages: ChatMessage[]
  thinking: boolean
  loadingChat: boolean
  error: string | null
  scope: Scope
  send: (text: string) => void
  openChat: (chatId: string) => void
  openNewChat: () => void
  changeScope: (scope: Scope) => void
}

export const ChatSessionContext = createContext<ChatSessionContextValue | null>(null)

export function useChatSession() {
  const context = useContext(ChatSessionContext)
  if (!context) {
    throw new Error('useChatSession must be used within ChatSessionProvider')
  }
  return context
}

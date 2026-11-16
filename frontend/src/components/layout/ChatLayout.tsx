import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { PanelLeft } from 'lucide-react'

import ChatSidebar from './ChatSidebar'
import ChatComposer from '../chat/ChatComposer'
import { ChatSessionProvider } from '../chat/ChatSessionContext'
import { useChatSession } from '../chat/chatSessionStore'

function ChatLayoutContent({
  expanded,
  onToggleSidebar,
  onCloseSidebar,
}: {
  expanded: boolean
  onToggleSidebar: () => void
  onCloseSidebar: () => void
}) {
  const { activeChatId } = useChatSession()

  return (
    <div className="chat-layout">
      <aside
        id="chat-sidebar"
        aria-label="Chat list"
        aria-hidden={!expanded}
        inert={!expanded}
        className={`chat-sidebar ${expanded ? 'is-open' : ''}`}
      >
        <div className="chat-sidebar__inner">
          <ChatSidebar currentChatId={activeChatId ?? undefined} onNavigate={onCloseSidebar} />
        </div>
      </aside>

      {expanded && (
        <button
          type="button"
          className="chat-scrim"
          aria-label="Close chat sidebar"
          tabIndex={-1}
          onClick={onCloseSidebar}
        />
      )}

      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Toggle chat sidebar"
        aria-expanded={expanded}
        aria-controls="chat-sidebar"
        className="chat-trigger"
      >
        <PanelLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className={`chat-main ${expanded ? 'is-expanded' : ''}`}>
        <div className="chat-transcript">
          <Outlet />
        </div>
        <ChatComposer />
      </div>
    </div>
  )
}

export default function ChatLayout() {
  const [sidebarState, setSidebarState] = useState<'expanded' | 'collapsed'>(() =>
    window.matchMedia('(min-width: 768px)').matches ? 'expanded' : 'collapsed',
  )
  const expanded = sidebarState === 'expanded'

  useEffect(() => {
    if (!expanded) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSidebarState('collapsed')
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [expanded])

  return (
    <ChatSessionProvider>
      <ChatLayoutContent
        expanded={expanded}
        onToggleSidebar={() => setSidebarState(expanded ? 'collapsed' : 'expanded')}
        onCloseSidebar={() => setSidebarState('collapsed')}
      />
    </ChatSessionProvider>
  )
}

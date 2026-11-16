import { useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { PanelLeft } from 'lucide-react'

import ChatSidebar from './ChatSidebar'

export default function ChatLayout() {
  const [sidebarState, setSidebarState] = useState<'expanded' | 'collapsed'>(() =>
    window.matchMedia('(min-width: 768px)').matches
      ? 'expanded'
      : 'collapsed',
  )
  const { chatId } = useParams<{ chatId: string }>()
  const expanded = sidebarState === 'expanded'

  return (
    <div className="relative mx-0 flex h-full">
      {/* Floating sidebar panel */}
      <aside
        aria-label="Chat list"
        className={`absolute bottom-3 left-3 top-3 z-30 flex flex-col overflow-hidden rounded-2xl bg-zinc-900 shadow-lg transition-all duration-300 ease-in-out ${
          expanded
            ? 'w-64 opacity-100 ring-1 ring-zinc-800'
            : 'w-0 opacity-0 ring-0'
        }`}
      >
        <div className="flex h-full w-64 flex-col">
          <ChatSidebar
            currentChatId={chatId}
            onNavigate={() => setSidebarState('collapsed')}
          />
        </div>
      </aside>

      {/* Mobile scrim */}
      {expanded && (
        <div
          className="absolute inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setSidebarState('collapsed')}
        />
      )}

      {/* Floating trigger — always above everything */}
      <button
        type="button"
        onClick={() =>
          setSidebarState(expanded ? 'collapsed' : 'expanded')
        }
        aria-label="Toggle sidebar"
        className="absolute left-3 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      {/* Main column */}
      <div
        className={`relative flex min-w-0 flex-1 flex-col transition-all duration-300 ${
          expanded ? 'md:ml-64' : ''
        }`}
      >
        <Outlet />
      </div>
    </div>
  )
}

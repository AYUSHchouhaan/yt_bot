import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, MessageSquare, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { api, type ChatSummary, type User } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { truncateLabel } from '../../lib/text'
import Brand from '../ui/Brand'
import { Button } from '../ui/Button'
import IconButton from '../ui/IconButton'
import { useChatSession } from '../chat/chatSessionStore'

export default function ChatSidebar({
  currentChatId,
  onNavigate,
}: {
  currentChatId?: string
  onNavigate: () => void
}) {
  const queryClient = useQueryClient()
  const { openNewChat } = useChatSession()
  const { data: user } = useQuery<User>({ queryKey: ['me'], queryFn: api.me })
  const { data: chats, isLoading } = useQuery<ChatSummary[]>({
    queryKey: ['chats'],
    queryFn: api.listChats,
  })

  async function handleSignOut() {
    await supabase.auth.signOut()
    queryClient.clear()
    window.location.assign('/signin')
  }

  function closeOnMobile() {
    if (!window.matchMedia('(min-width: 768px)').matches) onNavigate()
  }

  const initials = user?.display_name
    ? user.display_name.slice(0, 2).toUpperCase()
    : (user?.email?.slice(0, 2).toUpperCase() ?? '??')

  return (
    <>
      <header className="chat-sidebar__header">
        <Brand />
      </header>

      <div className="px-3 pt-3">
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            openNewChat()
            closeOnMobile()
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New chat
        </Button>
      </div>

      <nav className="chat-list" aria-label="Recent chats">
        {isLoading ? (
          <div className="space-y-2" role="status" aria-label="Loading chats">
            {[0, 1, 2].map((item) => <div key={item} className="skeleton h-10 w-full" />)}
          </div>
        ) : chats && chats.length > 0 ? (
          <ul className="m-0 list-none space-y-1 p-0">
            {chats.map((chat) => {
              const label = truncateLabel(chat.title ?? 'Untitled chat', 28)
              const active = chat.id === currentChatId
              return (
                <li key={chat.id}>
                  <Link
                    to={`/c/${chat.id}`}
                    title={chat.title ?? 'Untitled chat'}
                    onClick={closeOnMobile}
                    className="chat-row"
                    aria-current={active ? 'page' : undefined}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="note__meta px-2 py-4">No chats yet. Start one from a video.</p>
        )}
      </nav>

      <div className="chat-user">
        <span className="app-avatar" aria-hidden="true">
          {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="library-row__title">{user?.display_name ?? 'User'}</p>
          <p className="library-row__meta">{user?.email}</p>
        </div>
        <IconButton small onClick={handleSignOut} title="Sign out" aria-label="Sign out">
          <LogOut aria-hidden="true" />
        </IconButton>
      </div>
    </>
  )
}

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, MessageSquare, MonitorPlay, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { api, type ChatSummary, type User } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { truncateLabel } from '../../lib/text'

export default function ChatSidebar({
  currentChatId,
  onNavigate,
}: {
  currentChatId?: string
  onNavigate: () => void
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: user } = useQuery<User>({ queryKey: ['me'], queryFn: api.me })
  const { data: chats } = useQuery<ChatSummary[]>({
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
      <header className="flex items-center justify-center gap-2 px-4 py-4">
        <MonitorPlay className="h-5 w-5 text-red-500" />
        <span className="text-sm font-semibold text-zinc-200">yt_bot</span>
      </header>

      <div className="px-3">
        <button
          type="button"
          onClick={() => {
            navigate('/c/new')
            closeOnMobile()
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
        >
          <Plus className="h-4 w-4" />
          New chat
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {chats && chats.length > 0 ? (
          <ul className="space-y-0.5">
            {chats.map((chat) => {
              const label = truncateLabel(chat.title ?? 'Untitled chat', 28)
              const active = chat.id === currentChatId
              return (
                <li key={chat.id}>
                  <Link
                    to={`/c/${chat.id}`}
                    title={chat.title ?? 'Untitled chat'}
                    onClick={closeOnMobile}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    }`}
                  >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                  <span className="truncate">{label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="px-2.5 py-4 text-xs text-zinc-600">
            No chats yet — start one from a video.
          </p>
        )}
      </nav>

      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-center gap-2">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-300">
              {initials}
            </div>
          )}
          <div className="flex-1 truncate">
            <p className="truncate text-sm text-zinc-200">
              {user?.display_name ?? 'User'}
            </p>
            <p className="truncate text-xs text-zinc-500">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  )
}

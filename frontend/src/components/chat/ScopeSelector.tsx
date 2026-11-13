import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Layers, ListVideo, Video } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { api, type Library, type Playlist, type Scope } from '../../lib/api'

function derivePlaylistStatus(
  playlist: Playlist,
  videos: Library['videos'],
): string {
  const items = videos.filter((v) => v.playlist_id === playlist.id)
  if (items.length === 0) return 'empty'
  if (items.every((v) => v.status === 'ready')) return 'ready'
  if (items.some((v) => v.status === 'failed')) return 'failed'
  return 'processing'
}

export default function ScopeSelector({
  value,
  onChange,
}: {
  value: Scope
  onChange: (scope: Scope) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: library } = useQuery<Library>({
    queryKey: ['library'],
    queryFn: api.getLibrary,
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const readyVideos = library?.videos.filter((v) => v.status === 'ready') ?? []
  const readyPlaylists =
    library?.playlists.filter(
      (p) => derivePlaylistStatus(p, library.videos) === 'ready',
    ) ?? []

  const currentLabel = (() => {
    if (value.kind === 'library') return 'Entire library'
    if (value.kind === 'video') {
      const v = readyVideos.find((v) => v.id === value.id)
      return v?.title ?? v?.youtube_video_id ?? 'Video'
    }
    const p = readyPlaylists.find((p) => p.id === value.id)
    return p?.title ?? 'Playlist'
  })()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg bg-zinc-800/60 px-3 py-1.5 text-sm text-zinc-300 ring-1 ring-inset ring-zinc-700/60 transition-colors hover:bg-zinc-800"
      >
        <Layers className="h-3.5 w-3.5 text-zinc-500" />
        <span className="flex-1 truncate text-left">{currentLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-1 max-h-60 w-full overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              onChange({ kind: 'library' })
              setOpen(false)
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            <Layers className="h-3.5 w-3.5 text-zinc-500" />
            Entire library
          </button>

          {readyVideos.length > 0 && (
            <div className="px-3 pt-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Videos
            </div>
          )}
          {readyVideos.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                onChange({ kind: 'video', id: v.id })
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              <Video className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <span className="truncate">{v.title ?? v.youtube_video_id}</span>
            </button>
          ))}

          {readyPlaylists.length > 0 && (
            <div className="px-3 pt-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Playlists
            </div>
          )}
          {readyPlaylists.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange({ kind: 'playlist', id: p.id })
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              <ListVideo className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <span className="truncate">{p.title}</span>
            </button>
          ))}

          {readyVideos.length === 0 && readyPlaylists.length === 0 && (
            <div className="px-3 py-2 text-xs text-zinc-500">
              Ingest a video to scope your chat.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

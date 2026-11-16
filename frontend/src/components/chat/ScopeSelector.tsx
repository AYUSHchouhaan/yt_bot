import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Clock, Layers, ListVideo, Video as VideoIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { api, formatTime, type Library, type Playlist, type Scope, type Video } from '../../lib/api'

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

function VideoThumb({
  video,
  className,
}: {
  video: Video
  className: string
}) {
  if (video.thumbnail_url) {
    return (
      <img
        src={video.thumbnail_url}
        alt=""
        loading="lazy"
        className={`shrink-0 rounded-md object-cover ${className}`}
      />
    )
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md bg-zinc-800 ${className}`}
    >
      <VideoIcon className="h-3.5 w-3.5 text-zinc-600" />
    </div>
  )
}

function videoSummary(video: Video): string {
  const parts = [video.channel, video.duration_s != null ? formatTime(video.duration_s) : null]
  return parts.filter(Boolean).join(' · ')
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
      (p) => library && derivePlaylistStatus(p, library.videos) === 'ready',
    ) ?? []

  const selectedVideo =
    value.kind === 'video' ? readyVideos.find((v) => v.id === value.id) : undefined
  const selectedPlaylist =
    value.kind === 'playlist'
      ? readyPlaylists.find((p) => p.id === value.id)
      : undefined

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 rounded-lg bg-zinc-800/60 px-3 py-1.5 text-left text-sm text-zinc-300 ring-1 ring-inset ring-zinc-700/60 transition-colors hover:bg-zinc-800"
      >
        {selectedVideo ? (
          <VideoThumb video={selectedVideo} className="h-8 w-14" />
        ) : (
          <Layers className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        )}
        <span className="min-w-0 flex-1">
          {selectedVideo ? (
            <>
              <span className="block truncate text-zinc-200">
                {selectedVideo.title ?? 'Untitled video'}
              </span>
              <span className="block truncate text-xs text-zinc-500">
                {videoSummary(selectedVideo) || 'Video'}
              </span>
            </>
          ) : selectedPlaylist ? (
            <>
              <span className="block truncate text-zinc-200">
                {selectedPlaylist.title}
              </span>
              <span className="block truncate text-xs text-zinc-500">
                {selectedPlaylist.item_count} videos
              </span>
            </>
          ) : (
            <span className="block truncate">
              {value.kind === 'playlist' ? 'Playlist' : 'Entire library'}
            </span>
          )}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-1 max-h-72 w-full overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
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
          {readyVideos.map((v) => {
            const parent = v.playlist_id
              ? library?.playlists.find((p) => p.id === v.playlist_id)
              : null
            const summary = videoSummary(v)
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  onChange({ kind: 'video', id: v.id })
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800"
              >
                <VideoThumb video={v} className="h-10 w-[72px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-zinc-200">
                    {v.title ?? 'Untitled video'}
                  </span>
                  {summary && (
                    <span className="block truncate text-xs text-zinc-500">
                      {summary}
                    </span>
                  )}
                  {parent && (
                    <span className="block truncate text-xs text-zinc-600">
                      {parent.title}
                    </span>
                  )}
                </span>
                {v.duration_s != null && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-zinc-600">
                    <Clock className="h-3 w-3" />
                    {formatTime(v.duration_s)}
                  </span>
                )}
              </button>
            )
          })}

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
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800"
            >
              <div className="flex h-10 w-[72px] shrink-0 items-center justify-center rounded-md bg-zinc-800">
                <ListVideo className="h-5 w-5 text-zinc-600" />
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-zinc-200">{p.title}</span>
                <span className="block text-xs text-zinc-500">
                  {p.item_count} videos
                </span>
              </span>
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

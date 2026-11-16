import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Clock, Layers, ListVideo, Video as VideoIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { api, formatTime, type Library, type Playlist, type Scope, type Video } from '../../lib/api'
import { cn } from '../../lib/cn'

function derivePlaylistStatus(playlist: Playlist, videos: Library['videos']): string {
  const items = videos.filter((video) => video.playlist_id === playlist.id)
  if (items.length === 0) return 'empty'
  if (items.every((video) => video.status === 'ready')) return 'ready'
  if (items.some((video) => video.status === 'failed')) return 'failed'
  return 'processing'
}

function VideoThumb({ video, className }: { video: Video; className: string }) {
  if (video.thumbnail_url) {
    return (
      <img
        src={video.thumbnail_url}
        alt=""
        loading="lazy"
        className={cn('scope-thumb', className)}
      />
    )
  }

  return (
    <div className={cn('scope-thumb flex items-center justify-center', className)}>
      <VideoIcon className="scope-icon h-4 w-4" aria-hidden="true" />
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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  const { data: library } = useQuery<Library>({
    queryKey: ['library'],
    queryFn: api.getLibrary,
  })

  useEffect(() => {
    function handleClickOutside(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [])

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    setOpen(false)
    triggerRef.current?.focus()
  }

  const readyVideos = library?.videos.filter((video) => video.status === 'ready') ?? []
  const readyPlaylists =
    library?.playlists.filter(
      (playlist) => library && derivePlaylistStatus(playlist, library.videos) === 'ready',
    ) ?? []

  const selectedVideo =
    value.kind === 'video' ? readyVideos.find((video) => video.id === value.id) : undefined
  const selectedPlaylist =
    value.kind === 'playlist'
      ? readyPlaylists.find((playlist) => playlist.id === value.id)
      : undefined

  return (
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="scope-trigger"
        aria-expanded={open}
        aria-controls={menuId}
      >
        {selectedVideo ? (
          <VideoThumb video={selectedVideo} className="h-8 w-14" />
        ) : selectedPlaylist ? (
          <ListVideo className="scope-icon h-5 w-5" aria-hidden="true" />
        ) : (
          <Layers className="scope-icon h-4 w-4" aria-hidden="true" />
        )}
        <span className="scope-trigger__body">
          {selectedVideo ? (
            <>
              <span className="scope-trigger__title">{selectedVideo.title ?? 'Untitled video'}</span>
              <span className="scope-trigger__meta">{videoSummary(selectedVideo) || 'Video'}</span>
            </>
          ) : selectedPlaylist ? (
            <>
              <span className="scope-trigger__title">{selectedPlaylist.title}</span>
              <span className="scope-trigger__meta">{selectedPlaylist.item_count} videos</span>
            </>
          ) : (
            <span className="scope-trigger__title">
              {value.kind === 'playlist' ? 'Playlist' : value.kind === 'video' ? 'Video' : 'Entire library'}
            </span>
          )}
        </span>
        <ChevronDown className={`scope-icon h-4 w-4 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div id={menuId} className="scope-menu" role="group" aria-label="Available chat scopes">
          <button
            type="button"
            onClick={() => {
              onChange({ kind: 'library' })
              setOpen(false)
            }}
            className="scope-option"
            aria-current={value.kind === 'library' ? 'true' : undefined}
          >
            <Layers className="scope-icon h-4 w-4" aria-hidden="true" />
            <span className="scope-option__title">Entire library</span>
          </button>

          {readyVideos.length > 0 && <p className="scope-group-label">Videos</p>}
          {readyVideos.map((video) => {
            const parent = video.playlist_id
              ? library?.playlists.find((playlist) => playlist.id === video.playlist_id)
              : null
            const summary = videoSummary(video)
            return (
              <button
                key={video.id}
                type="button"
                onClick={() => {
                  onChange({ kind: 'video', id: video.id })
                  setOpen(false)
                }}
                className="scope-option"
                aria-current={value.kind === 'video' && value.id === video.id ? 'true' : undefined}
              >
                <VideoThumb video={video} className="h-10 w-[72px]" />
                <span className="scope-option__body">
                  <span className="scope-option__title">{video.title ?? 'Untitled video'}</span>
                  {summary && <span className="scope-option__meta">{summary}</span>}
                  {parent && <span className="scope-option__meta">{parent.title}</span>}
                </span>
                {video.duration_s != null && (
                  <span className="scope-option__meta flex shrink-0 items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {formatTime(video.duration_s)}
                  </span>
                )}
              </button>
            )
          })}

          {readyPlaylists.length > 0 && <p className="scope-group-label">Playlists</p>}
          {readyPlaylists.map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              onClick={() => {
                onChange({ kind: 'playlist', id: playlist.id })
                setOpen(false)
              }}
              className="scope-option"
              aria-current={value.kind === 'playlist' && value.id === playlist.id ? 'true' : undefined}
            >
              <span className="scope-thumb flex h-10 w-[72px] items-center justify-center">
                <ListVideo className="scope-icon h-5 w-5" aria-hidden="true" />
              </span>
              <span className="scope-option__body">
                <span className="scope-option__title">{playlist.title}</span>
                <span className="scope-option__meta">{playlist.item_count} videos</span>
              </span>
            </button>
          ))}

          {readyVideos.length === 0 && readyPlaylists.length === 0 && (
            <p className="scope-option__meta px-3 py-2">Ingest a video to scope your chat.</p>
          )}
        </div>
      )}
    </div>
  )
}

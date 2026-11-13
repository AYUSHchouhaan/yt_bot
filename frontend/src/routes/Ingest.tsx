import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Clock,
  Link2,
  ListVideo,
  Loader2,
  Video,
  XCircle,
} from 'lucide-react'

import { api, type JobStatus, type Library, type Scope } from '../lib/api'

type IngestType = 'video' | 'playlist'

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle2; cls: string; label: string }
> = {
  ready: { icon: CheckCircle2, cls: 'text-emerald-400', label: 'Ready' },
  queued: { icon: Clock, cls: 'text-zinc-400', label: 'Queued' },
  fetching: { icon: Clock, cls: 'text-amber-400', label: 'Fetching' },
  embedding: { icon: Clock, cls: 'text-amber-400', label: 'Embedding' },
  processing: { icon: Clock, cls: 'text-amber-400', label: 'Processing' },
  failed: { icon: XCircle, cls: 'text-red-400', label: 'Failed' },
  empty: { icon: Clock, cls: 'text-zinc-500', label: 'Empty' },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.queued
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${config.cls}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

export default function Ingest() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [url, setUrl] = useState('')
  const [type, setType] = useState<IngestType>('video')
  const [submitting, setSubmitting] = useState(false)
  const [jobId, setJobId] = useState<number | null>(null)
  const [job, setJob] = useState<JobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: library } = useQuery<Library>({
    queryKey: ['library'],
    queryFn: api.getLibrary,
  })

  useEffect(() => {
    if (jobId === null) return
    let active = true

    const poll = async () => {
      while (active) {
        try {
          const j = await api.getJob(jobId)
          if (!active) return
          setJob(j)
          if (j.status === 'done' || j.status === 'failed') {
            setJobId(null)
            queryClient.invalidateQueries({ queryKey: ['library'] })
            if (j.status === 'failed') {
              setError(j.error ?? 'Ingestion failed')
            }
            return
          }
        } catch {
          if (!active) return
          setJobId(null)
          setError('Failed to check job status')
          return
        }
        await new Promise((r) => setTimeout(r, 2000))
      }
    }
    poll()

    return () => {
      active = false
    }
  }, [jobId, queryClient])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    setError(null)
    setJob(null)

    try {
      const res =
        type === 'video'
          ? await api.ingestVideo(trimmed)
          : await api.ingestPlaylist(trimmed)

      if (res.job_id) {
        setJobId(res.job_id)
      } else {
        queryClient.invalidateQueries({ queryKey: ['library'] })
      }
      setUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start ingestion')
    } finally {
      setSubmitting(false)
    }
  }

  function startChat(scope: Scope) {
    navigate(`/c/new?scope=${scope.kind}${scope.id ? `&id=${scope.id}` : ''}`)
  }

  function playlistStatus(playlistId: number): string {
    const items = library?.videos.filter((v) => v.playlist_id === playlistId)
    if (!items || items.length === 0) return 'empty'
    if (items.every((v) => v.status === 'ready')) return 'ready'
    if (items.some((v) => v.status === 'failed')) return 'failed'
    return 'processing'
  }

  const ingesting = submitting || jobId !== null
  const hasLibrary =
    library && (library.videos.length > 0 || library.playlists.length > 0)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Ingest</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Paste a YouTube URL to ingest its transcript. Once ready, chat about
          it.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
            {(['video', 'playlist'] as IngestType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  type === t
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t === 'video' ? 'Video' : 'Playlist'}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                type === 'video'
                  ? 'https://youtube.com/watch?v=…'
                  : 'https://youtube.com/playlist?list=…'
              }
              disabled={ingesting}
              className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 ring-1 ring-inset ring-zinc-800 focus:outline-none focus:ring-zinc-600"
            />
            <button
              type="submit"
              disabled={ingesting || !url.trim()}
              className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ingesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Ingest
            </button>
          </div>
        </form>

        {job && (
          <div className="mt-4 rounded-lg bg-zinc-900 p-3 ring-1 ring-inset ring-zinc-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-300">
                Ingesting… {job.done}/{job.total}
              </span>
              <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-zinc-500 transition-all"
                style={{
                  width: `${job.total > 0 ? (job.done / job.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-8">
          <h2 className="text-sm font-medium text-zinc-400">Library</h2>

          {library && library.videos.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
                Videos
              </p>
              {library.videos.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 ring-1 ring-inset ring-zinc-800/50"
                >
                  <Video className="h-4 w-4 shrink-0 text-zinc-600" />
                  <div className="flex-1 truncate">
                    <p className="truncate text-sm text-zinc-200">
                      {v.title ?? v.youtube_video_id}
                    </p>
                  </div>
                  <StatusBadge status={v.status} />
                  {v.status === 'ready' && (
                    <button
                      type="button"
                      onClick={() => startChat({ kind: 'video', id: v.id })}
                      className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                    >
                      Chat
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {library && library.playlists.length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
                Playlists
              </p>
              {library.playlists.map((p) => {
                const status = playlistStatus(p.id)
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 ring-1 ring-inset ring-zinc-800/50"
                  >
                    <ListVideo className="h-4 w-4 shrink-0 text-zinc-600" />
                    <div className="flex-1 truncate">
                      <p className="truncate text-sm text-zinc-200">{p.title}</p>
                      <p className="text-xs text-zinc-600">
                        {p.item_count} videos
                      </p>
                    </div>
                    <StatusBadge status={status} />
                    {status === 'ready' && (
                      <button
                        type="button"
                        onClick={() =>
                          startChat({ kind: 'playlist', id: p.id })
                        }
                        className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                      >
                        Chat
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!hasLibrary && (
            <p className="mt-3 text-sm text-zinc-600">
              No videos yet. Paste a URL above to get started.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

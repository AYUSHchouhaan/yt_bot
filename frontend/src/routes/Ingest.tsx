import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Clock,
  LibraryBig,
  Link2,
  ListVideo,
  Loader2,
  Video,
  XCircle,
} from 'lucide-react'

import { api, formatTime, type JobStatus, type Library, type Scope } from '../lib/api'
import { Button } from '../components/ui/Button'
import Card from '../components/ui/Card'
import { Chip, type ChipTone } from '../components/ui/Chip'
import EmptyState from '../components/ui/EmptyState'
import Eyebrow from '../components/ui/Eyebrow'
import Input from '../components/ui/Input'

type IngestType = 'video' | 'playlist'

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle2; tone: ChipTone; label: string }
> = {
  ready: { icon: CheckCircle2, tone: 'teal', label: 'Ready' },
  queued: { icon: Clock, tone: 'paper', label: 'Queued' },
  fetching: { icon: Clock, tone: 'yellow', label: 'Fetching' },
  embedding: { icon: Clock, tone: 'sky', label: 'Embedding' },
  processing: { icon: Clock, tone: 'sky', label: 'Processing' },
  failed: { icon: XCircle, tone: 'coral', label: 'Failed' },
  empty: { icon: Clock, tone: 'paper', label: 'Empty' },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.queued
  const Icon = config.icon
  return (
    <Chip tone={config.tone}>
      <Icon aria-hidden="true" />
      {config.label}
    </Chip>
  )
}

export default function Ingest() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const [url, setUrl] = useState('')
  const [type, setType] = useState<IngestType>('video')
  const [submitting, setSubmitting] = useState(false)
  const [jobId, setJobId] = useState<number | null>(null)
  const [job, setJob] = useState<JobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    data: library,
    isLoading: libraryLoading,
    isError: libraryError,
    refetch: refetchLibrary,
  } = useQuery<Library>({
    queryKey: ['library'],
    queryFn: api.getLibrary,
  })

  useEffect(() => {
    if (location.hash !== '#library') return
    const frame = requestAnimationFrame(() => {
      document.getElementById('library')?.scrollIntoView({ block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.hash])

  useEffect(() => {
    if (jobId === null) return
    let active = true

    const poll = async () => {
      while (active) {
        try {
          const nextJob = await api.getJob(jobId)
          if (!active) return
          setJob(nextJob)
          if (nextJob.status === 'done' || nextJob.status === 'failed') {
            setJobId(null)
            queryClient.invalidateQueries({ queryKey: ['library'] })
            if (nextJob.status === 'failed') {
              setError(nextJob.error ?? 'Ingestion failed')
            }
            return
          }
        } catch {
          if (!active) return
          setJobId(null)
          setError('Failed to check job status')
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }
    poll()

    return () => {
      active = false
    }
  }, [jobId, queryClient])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = url.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    setError(null)
    setJob(null)

    try {
      const response =
        type === 'video'
          ? await api.ingestVideo(trimmed)
          : await api.ingestPlaylist(trimmed)

      if (response.job_id) {
        setJobId(response.job_id)
      } else {
        queryClient.invalidateQueries({ queryKey: ['library'] })
      }
      setUrl('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to start ingestion')
    } finally {
      setSubmitting(false)
    }
  }

  function startChat(scope: Scope) {
    navigate(`/c/new?scope=${scope.kind}${scope.id ? `&id=${scope.id}` : ''}`)
  }

  function playlistStatus(playlistId: number): string {
    const items = library?.videos.filter((video) => video.playlist_id === playlistId)
    if (!items || items.length === 0) return 'empty'
    if (items.every((video) => video.status === 'ready')) return 'ready'
    if (items.some((video) => video.status === 'failed')) return 'failed'
    return 'processing'
  }

  const ingesting = submitting || jobId !== null
  const hasLibrary =
    library && (library.videos.length > 0 || library.playlists.length > 0)
  const progress = job && job.total > 0 ? (job.done / job.total) * 100 : 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[800px] px-4 py-8 sm:px-6 sm:py-10">
        <header>
          <Eyebrow>build your searchable library</Eyebrow>
          <h1 className="app-page-title">Ingest</h1>
          <p className="app-page-sub">
            Paste a YouTube URL to prepare its transcript. Once it’s ready, start asking questions.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-7">
          <div className="segmented" role="group" aria-label="Source type">
            {(['video', 'playlist'] as IngestType[]).map((sourceType) => (
              <button
                key={sourceType}
                type="button"
                onClick={() => setType(sourceType)}
                className="segmented__button"
                aria-pressed={type === sourceType}
              >
                {sourceType === 'video' ? <Video className="h-4 w-4" aria-hidden="true" /> : <ListVideo className="h-4 w-4" aria-hidden="true" />}
                {sourceType === 'video' ? 'Video' : 'Playlist'}
              </button>
            ))}
          </div>

          <Card app className="mt-5 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Input
                app
                wrapperClassName="flex-1"
                label="YouTube URL"
                type="url"
                required
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder={
                  type === 'video'
                    ? 'https://youtube.com/watch?v=…'
                    : 'https://youtube.com/playlist?list=…'
                }
                disabled={ingesting}
                error={error ?? undefined}
              />
              <Button
                app
                type="submit"
                disabled={ingesting}
                className="w-full sm:mt-[30px] sm:w-auto"
                aria-busy={submitting}
              >
                {ingesting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
                Ingest
              </Button>
            </div>
          </Card>
        </form>

        {job && (
          <Card app className="mt-5 p-4" role="status">
            <div className="flex items-center justify-between gap-4 text-sm font-semibold">
              <span>
                {job.status === 'done'
                  ? 'Ingestion complete'
                  : job.status === 'failed'
                    ? 'Ingestion failed'
                    : `Ingesting… ${job.done}/${job.total}`}
              </span>
              {job.status === 'done' ? (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              ) : job.status === 'failed' ? (
                <XCircle className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              )}
            </div>
            <div
              className="progress__track mt-3"
              role="progressbar"
              aria-label="Ingestion progress"
              aria-valuemin={0}
              aria-valuemax={job.total || 1}
              aria-valuenow={Math.min(job.done, job.total || 1)}
              aria-valuetext={`${job.done} of ${job.total} items processed`}
            >
              <div className="progress__fill" style={{ width: `${progress}%` }} />
            </div>
          </Card>
        )}

        <section id="library" className="mt-10 scroll-mt-5" aria-labelledby="library-title">
          <div className="mb-5">
            <Eyebrow>your sources, ready when you are</Eyebrow>
            <h2 id="library-title" className="app-page-title">Library</h2>
          </div>

          {libraryLoading && (
            <div className="space-y-3" role="status" aria-label="Loading your library">
              {[0, 1, 2].map((item) => (
                <div key={item} className="library-row" aria-hidden="true">
                  <div className="skeleton h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-2/3" />
                    <div className="skeleton h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {libraryError && (
            <Card tone="blush" app className="p-5">
              <p className="m-0 text-sm" role="alert">Your library couldn’t be loaded.</p>
              <Button variant="ghost" size="sm" className="mt-4" onClick={() => void refetchLibrary()}>
                Retry loading
              </Button>
            </Card>
          )}

          {library && library.videos.length > 0 && (
            <div className="space-y-3">
              <h3 className="m-0 text-sm tracking-wide">Videos</h3>
              {library.videos.map((video) => (
                <article key={video.id} className="library-row">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt="" loading="lazy" className="library-row__thumb" />
                  ) : (
                    <div className="library-row__tile"><Video className="h-5 w-5" aria-hidden="true" /></div>
                  )}
                  <div className="library-row__body">
                    <p className="library-row__title">{video.title ?? 'Untitled video'}</p>
                    <p className="library-row__meta">
                      {[video.channel, video.duration_s != null ? formatTime(video.duration_s) : null]
                        .filter(Boolean)
                        .join(' · ') || 'Video transcript'}
                    </p>
                  </div>
                  <div className="library-row__actions">
                    <StatusBadge status={video.status} />
                    {video.status === 'ready' && (
                      <Button app size="sm" onClick={() => startChat({ kind: 'video', id: video.id })}>
                        Chat
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {library && library.playlists.length > 0 && (
            <div className="mt-7 space-y-3">
              <h3 className="m-0 text-sm tracking-wide">Playlists</h3>
              {library.playlists.map((playlist) => {
                const status = playlistStatus(playlist.id)
                return (
                  <article key={playlist.id} className="library-row">
                    <div className="library-row__tile"><ListVideo className="h-5 w-5" aria-hidden="true" /></div>
                    <div className="library-row__body">
                      <p className="library-row__title">{playlist.title}</p>
                      <p className="library-row__meta">{playlist.item_count} videos</p>
                    </div>
                    <div className="library-row__actions">
                      <StatusBadge status={status} />
                      {status === 'ready' && (
                        <Button app size="sm" onClick={() => startChat({ kind: 'playlist', id: playlist.id })}>
                          Chat
                        </Button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {!libraryLoading && !libraryError && !hasLibrary && (
            <EmptyState
              icon={LibraryBig}
              title="Your library is ready for its first source"
              description="Paste a video or playlist URL above. Prepared transcripts will appear here."
              reassurance="One good video is enough to start."
            />
          )}
        </section>
      </div>
    </div>
  )
}

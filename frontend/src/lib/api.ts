import { apiFetch } from './http'

export type ScopeKind = 'video' | 'playlist' | 'library'

export interface Scope {
  kind: ScopeKind
  id?: number | null
}

export interface User {
  id: number
  supabase_id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Video {
  id: number
  youtube_video_id: string
  title: string | null
  channel: string | null
  duration_s: number | null
  thumbnail_url: string | null
  status: string
  playlist_id: number | null
}

export interface Playlist {
  id: number
  youtube_playlist_id: string
  title: string
  item_count: number
}

export interface Library {
  videos: Video[]
  playlists: Playlist[]
}

export interface JobStatus {
  status: string
  total: number
  done: number
  error: string | null
}

export interface IngestVideoResponse {
  video_id: number
  job_id: number | null
  status: string
  playlist_id: number | null
}

export interface IngestPlaylistResponse {
  playlist_id: number
  job_id: number | null
  total: number
  status: string
}

export interface Citation {
  youtube_id: string | null
  title: string | null
  start_s: number
  score: number | null
}

export interface ChatMessage {
  id: number
  role: string
  content: string
  citations: Citation[] | null
}

export interface ChatSummary {
  id: string
  title: string | null
  video_id: number | null
  playlist_id: number | null
}

export interface ChatDetail {
  id: string
  title: string | null
  video_id: number | null
  playlist_id: number | null
  messages: ChatMessage[]
}

export interface SendChatResponse {
  chat_id: string
  answer: string
  citations: Citation[]
}

export const api = {
  me: () => apiFetch<User>('/me'),
  ingestVideo: (url: string) =>
    apiFetch<IngestVideoResponse>('/ingest/video', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  ingestPlaylist: (url: string) =>
    apiFetch<IngestPlaylistResponse>('/ingest/playlist', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  getJob: (id: number) => apiFetch<JobStatus>(`/jobs/${id}`),
  getLibrary: () => apiFetch<Library>('/library'),
  listChats: () => apiFetch<ChatSummary[]>('/chats'),
  getChat: (id: string) => apiFetch<ChatDetail>(`/chats/${id}`),
  sendChat: (body: { message: string; chat_id?: string; scope: Scope }) =>
    apiFetch<SendChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

import { useNavigate } from 'react-router-dom'
import { MonitorPlay } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-zinc-100">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800">
        <MonitorPlay className="h-7 w-7 text-red-500" />
      </div>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">yt_bot</h1>
      <p className="mt-3 max-w-md text-zinc-400">
        Chat with your YouTube library. Ingest a video or playlist, then ask
        anything — answers are grounded in the transcript, with citations.
      </p>
      <button
        type="button"
        onClick={() => navigate('/c/new')}
        className="mt-8 rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
      >
        Open App
      </button>
      <p className="mt-4 text-xs text-zinc-600">Free — sign in with Google.</p>
    </main>
  )
}

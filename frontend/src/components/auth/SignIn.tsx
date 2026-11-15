import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { supabase } from '../../lib/supabase'

export default function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)

  const from =
    (location.state as { from?: string } | null)?.from ?? '/ingest'

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate(from, { replace: true })
    })
    return () => {
      active = false
    }
  }, [from, navigate])

  async function handleSignIn() {
    setError(null)
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(from)}`

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (oauthError) setError(oauthError.message)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-semibold tracking-tight">yt_bot</h1>
        <p className="mt-3 text-sm text-zinc-400">
          Ask questions about any YouTube video or playlist, grounded in its
          transcript.
        </p>
        <button
          type="button"
          onClick={handleSignIn}
          className="mt-8 w-full rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
        >
          Continue with Google
        </button>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    </main>
  )
}

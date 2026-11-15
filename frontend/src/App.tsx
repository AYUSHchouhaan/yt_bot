import { useEffect, useState, type ReactNode } from 'react'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import Protected from './components/auth/Protected'
import SignIn from './components/auth/SignIn'
import Chat from './routes/Chat'
import Ingest from './routes/Ingest'
import { supabase } from './lib/supabase'

const SIGN_IN_TIMEOUT_MS = 15_000

function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  const nextParam = searchParams.get('next')
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/ingest'

  useEffect(() => {
    let active = true

    const fail = (message: string) => {
      if (active) setError(message)
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const urlError =
      searchParams.get('error_description') ||
      searchParams.get('error') ||
      hash.get('error_description') ||
      hash.get('error')

    if (urlError) {
      fail(decodeURIComponent(urlError))
      return () => {
        active = false
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && active) navigate(next, { replace: true })
    })

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        fail(sessionError.message)
        return
      }
      if (data.session) navigate(next, { replace: true })
    })

    const timer = setTimeout(() => {
      fail('Sign-in timed out. Please try again.')
    }, SIGN_IN_TIMEOUT_MS)

    return () => {
      active = false
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [navigate, next, searchParams])

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-lg font-semibold">Couldn't sign you in</h1>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
          <Link
            to="/signin"
            className="mt-6 inline-block rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-white"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
      <p className="text-sm">Signing you in…</p>
    </main>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  return <Protected>{children}</Protected>
}

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/ingest"
        element={
          <ProtectedRoute>
            <Ingest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/c/:chatId"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/ingest" replace />} />
      <Route path="*" element={<Navigate to="/ingest" replace />} />
    </Routes>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import Protected from './components/auth/Protected'
import SignIn from './components/auth/SignIn'
import AuthPanel from './components/auth/AuthPanel'
import AppLayout from './components/layout/AppLayout'
import ChatLayout from './components/layout/ChatLayout'
import Chat from './routes/Chat'
import Ingest from './routes/Ingest'
import Landing from './routes/Landing'
import { supabase } from './lib/supabase'
import { ButtonLink } from './components/ui/Button'

const SIGN_IN_TIMEOUT_MS = 15_000

function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  const nextParam = searchParams.get('next')
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/c/new'

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
      <AuthPanel
        eyebrow="a small detour"
        title="Couldn’t sign you in"
        description="The sign-in flow did not complete. Return to the sign-in page and try again."
        error={error}
      >
        <ButtonLink to="/signin" variant="ghost" className="w-full">
          Back to sign in
        </ButtonLink>
      </AuthPanel>
    )
  }

  return (
    <AuthPanel
      eyebrow="nearly there"
      title="Opening your library"
      description="Finishing secure sign-in and preparing your conversations."
    >
      <p className="thinking justify-center" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Signing you in…
      </p>
    </AuthPanel>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  return <Protected>{children}</Protected>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/ingest" element={<Ingest />} />
        <Route element={<ChatLayout />}>
          <Route path="/c/:chatId" element={<Chat />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

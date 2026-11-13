import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import Protected from './components/auth/Protected'
import SignIn from './components/auth/SignIn'
import Chat from './routes/Chat'
import Ingest from './routes/Ingest'

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => navigate('/ingest', { replace: true }), 800)
    return () => clearTimeout(timer)
  }, [navigate])

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

import { useEffect } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'

import Protected from './components/auth/Protected'
import SignIn from './components/auth/SignIn'

function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">yt_bot</h1>
        <p className="mt-2 text-zinc-400">
          You are signed in. The library and chat arrive in later steps.
        </p>
      </div>
    </main>
  )
}

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => navigate('/', { replace: true }), 800)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
      <p className="text-sm">Signing you in…</p>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="*"
        element={
          <Protected>
            <Home />
          </Protected>
        }
      />
    </Routes>
  )
}

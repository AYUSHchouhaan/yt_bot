import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'

import { supabase } from '../../lib/supabase'
import AuthPanel from './AuthPanel'

export default function Protected({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const location = useLocation()

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (!ready) {
    return (
      <AuthPanel
        eyebrow="checking your session"
        title="Opening your library"
        description="Getting your conversations and sources ready."
      >
        <p className="thinking justify-center" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Checking your session…
        </p>
      </AuthPanel>
    )
  }

  if (!session) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  return <>{children}</>
}

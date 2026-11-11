import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'

import { supabase } from '../../lib/supabase'

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

  if (!ready) return null
  if (!session) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

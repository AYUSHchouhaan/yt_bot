import { supabase } from './supabase'

const API_BASE = '/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })

  if (response.status === 401) {
    await supabase.auth.signOut()
    window.location.assign('/signin')
    throw new ApiError('Unauthorized', 401)
  }

  if (!response.ok) {
    let detail = `API request failed: ${response.status} ${response.statusText}`
    const payload = (await response
      .json()
      .catch(() => null)) as { detail?: unknown } | null
    if (payload && typeof payload.detail === 'string' && payload.detail) {
      detail = payload.detail
    }
    throw new ApiError(detail, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

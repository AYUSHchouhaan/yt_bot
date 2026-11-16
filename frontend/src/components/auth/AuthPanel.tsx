import type { ReactNode } from 'react'

import Brand from '../ui/Brand'
import Eyebrow from '../ui/Eyebrow'

type AuthPanelProps = {
  eyebrow: string
  title: string
  description: string
  error?: string | null
  children?: ReactNode
}

export default function AuthPanel({ eyebrow, title, description, error, children }: AuthPanelProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="auth-panel w-full max-w-[440px] text-center" aria-labelledby="auth-title">
        <div className="mb-5 flex justify-center"><Brand /></div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 id="auth-title" className="auth-panel__title">{title}</h1>
        <p className="auth-panel__lede">{description}</p>
        {children}
        {error && <p className="auth-error" role="alert">{error}</p>}
      </section>
    </main>
  )
}

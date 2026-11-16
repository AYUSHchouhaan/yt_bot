import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'

type StatPillProps = {
  value: ReactNode
  label: string
  tone: 'views' | 'likes' | 'comments'
  icon?: ReactNode
  className?: string
}

export default function StatPill({ value, label, tone, icon, className }: StatPillProps) {
  return (
    <span className={cn('stat', `stat--${tone}`, className)}>
      {icon}
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </span>
  )
}

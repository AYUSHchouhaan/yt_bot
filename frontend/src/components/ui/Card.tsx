import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/cn'

export type CardTone = 'white' | 'warm' | 'cool' | 'blush' | 'paper'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: CardTone
  interactive?: boolean
  app?: boolean
}

export default function Card({
  tone = 'white',
  interactive = false,
  app = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'card',
        `card--${tone}`,
        interactive && 'card--interactive',
        app && 'card--app',
        className,
      )}
      {...props}
    />
  )
}

import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/cn'

export type ChipTone = 'paper' | 'yellow' | 'teal' | 'sky' | 'coral'

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: ChipTone
}

export function Chip({ tone = 'paper', className, ...props }: ChipProps) {
  return <span className={cn('chip', `chip--${tone}`, className)} {...props} />
}

export function Tag({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('tag', className)} {...props} />
}

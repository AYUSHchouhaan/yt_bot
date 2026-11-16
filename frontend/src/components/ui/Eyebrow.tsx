import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/cn'

export default function Eyebrow({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('eyebrow', className)} {...props} />
}

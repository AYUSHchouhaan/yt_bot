import type { ButtonHTMLAttributes } from 'react'

import { cn } from '../../lib/cn'
import { Button } from './Button'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  small?: boolean
}

export default function IconButton({ small, className, ...props }: IconButtonProps) {
  return (
    <Button
      variant="ghost"
      size={small ? 'sm' : 'md'}
      className={cn('icon-button', small && 'icon-button--sm', className)}
      {...props}
    />
  )
}

import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'ghost' | 'link' | 'danger'
export type ButtonSize = 'md' | 'sm'

type SharedProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  app?: boolean
  className?: string
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & SharedProps

function buttonClasses({ variant = 'primary', size = 'md', app, className }: SharedProps) {
  return cn(
    'btn',
    `btn--${variant}`,
    size === 'sm' && 'btn--sm',
    app && 'btn--app',
    className,
  )
}

export function Button({
  variant,
  size,
  app,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, app, className })}
      {...props}
    />
  )
}

type ButtonLinkProps = LinkProps & SharedProps

export function ButtonLink({ variant, size, app, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, size, app, className })} {...props} />
}

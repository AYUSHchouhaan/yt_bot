import { useId, type InputHTMLAttributes } from 'react'

import { cn } from '../../lib/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  helper?: string
  error?: string
  app?: boolean
  wrapperClassName?: string
}

export default function Input({
  label,
  helper,
  error,
  app = false,
  wrapperClassName,
  className,
  id,
  ...props
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = `${inputId}-description`

  return (
    <div className={cn('field', wrapperClassName)}>
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={cn('input', app && 'input--app', error && 'input--error', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={helper || error ? descriptionId : undefined}
        {...props}
      />
      {(error || helper) && (
        <p
          id={descriptionId}
          className={error ? 'field__error' : 'field__helper'}
          role={error ? 'alert' : undefined}
        >
          {error ?? helper}
        </p>
      )}
    </div>
  )
}

import { useRef } from 'react'
import { Link } from 'react-router-dom'

import useEyes from '../../hooks/useEyes'
import { cn } from '../../lib/cn'

type BrandProps = {
  to?: string
  showWordmark?: boolean
  className?: string
}

export default function Brand({ to, showWordmark = true, className }: BrandProps) {
  const ref = useRef<HTMLSpanElement>(null)
  useEyes(ref)

  const content = (
    <>
      <span className="eyes" aria-hidden="true">
        <span className="eye" />
        <span className="eye" />
      </span>
      {showWordmark && <span className="brand__wordmark">yt_bot</span>}
    </>
  )

  return (
    <span ref={ref} className={cn('brand', className)} translate="no">
      {to ? (
        <Link to={to} className="brand__link" aria-label="yt_bot">
          {content}
        </Link>
      ) : (
        content
      )}
    </span>
  )
}

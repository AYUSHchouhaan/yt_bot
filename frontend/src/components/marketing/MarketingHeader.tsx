import { useEffect, useRef, useState } from 'react'

import Brand from '../ui/Brand'
import { Button, ButtonLink } from '../ui/Button'

const LINKS = [
  { href: '#top', label: 'Home' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
]

export default function MarketingHeader() {
  const [open, setOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      document.getElementById('marketing-menu-button')?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <header ref={headerRef} className="marketing-header">
      <div className="shell marketing-nav">
        <Brand to="/" />
        <nav className="marketing-links" aria-label="Marketing navigation">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="marketing-link">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="marketing-nav__actions">
          <Button
            id="marketing-menu-button"
            variant="ghost"
            size="sm"
            className="marketing-disclosure"
            aria-expanded={open}
            aria-controls="marketing-mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Close' : 'Menu'}
          </Button>
          <ButtonLink to="/c/new" size="sm">
            Open app
          </ButtonLink>
        </div>
      </div>
      <nav
        id="marketing-mobile-menu"
        className={`mobile-menu ${open ? 'is-open' : ''}`}
        aria-label="Mobile marketing navigation"
      >
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="marketing-link"
            onClick={() => setOpen(false)}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  )
}

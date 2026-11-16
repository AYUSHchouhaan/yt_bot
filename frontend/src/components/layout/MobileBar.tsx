import { Home, Inbox, Library, MessageSquarePlus } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { cn } from '../../lib/cn'

export default function MobileBar() {
  const { pathname, hash } = useLocation()

  const links = [
    { to: '/', label: 'Home', icon: Home, active: pathname === '/' },
    { to: '/c/new', label: 'New chat', icon: MessageSquarePlus, active: pathname.startsWith('/c/') },
    { to: '/ingest', label: 'Ingest', icon: Inbox, active: pathname === '/ingest' && hash !== '#library' },
    { to: '/ingest#library', label: 'Library', icon: Library, active: pathname === '/ingest' && hash === '#library' },
  ]

  return (
    <nav className="mobile-bar" aria-label="Mobile app navigation">
      {links.map(({ to, label, icon: Icon, active }) => (
        <Link
          key={label}
          to={to}
          className={cn('mobile-bar__item')}
          aria-current={active ? 'page' : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'

import { api, type User } from '../../lib/api'
import Brand from '../ui/Brand'
import { Chip } from '../ui/Chip'

export default function Navbar() {
  const { pathname, hash } = useLocation()
  const { data: user } = useQuery<User>({ queryKey: ['me'], queryFn: api.me })

  const links = [
    { to: '/', label: 'Home', active: pathname === '/' },
    { to: '/c/new', label: 'New chat', active: pathname.startsWith('/c/') },
    { to: '/ingest', label: 'Ingest', active: pathname === '/ingest' && hash !== '#library' },
    { to: '/ingest#library', label: 'Library', active: pathname === '/ingest' && hash === '#library' },
  ]

  const initials = user?.display_name
    ? user.display_name.slice(0, 2).toUpperCase()
    : (user?.email?.slice(0, 2).toUpperCase() ?? 'YT')

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Brand to="/" />
        <nav className="app-nav hidden md:flex" aria-label="App navigation">
          {links.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="nav-pill"
              aria-current={link.active ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 md:ml-0">
          <Chip>FREE</Chip>
          <span className="app-avatar" title={user?.display_name ?? user?.email ?? 'yt_bot user'} aria-hidden="true">
            {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : initials}
          </span>
        </div>
      </div>
    </header>
  )
}

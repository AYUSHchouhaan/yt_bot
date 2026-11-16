import { Link, NavLink } from 'react-router-dom'
import { MonitorPlay } from 'lucide-react'

const LINKS: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/c/new', label: 'New Chat' },
  { to: '/ingest', label: 'Ingest' },
]

export default function Navbar() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-5 border-b border-zinc-800/60 px-4">
      <Link to="/" className="flex items-center gap-2">
        <MonitorPlay className="h-5 w-5 text-red-500" />
        <span className="text-sm font-semibold text-zinc-200">yt_bot</span>
      </Link>
      <nav className="flex items-center gap-1">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

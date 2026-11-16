import { Link, Outlet } from 'react-router-dom'

import Navbar from './Navbar'
import MobileBar from './MobileBar'

export default function AppLayout() {
  return (
    <div className="app-shell flex flex-col">
      <a href="#app-content" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="app-content" className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>© 2026 yt_bot · Answers grounded in your library.</span>
        <nav className="app-footer__links" aria-label="Footer navigation">
          <Link to="/">Home</Link>
          <Link to="/c/new">New chat</Link>
          <Link to="/ingest">Ingest</Link>
        </nav>
      </footer>
      <MobileBar />
    </div>
  )
}

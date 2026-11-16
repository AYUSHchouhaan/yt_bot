import { Link } from 'react-router-dom'

import Brand from '../ui/Brand'

export default function MarketingFooter() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer__grid">
          <div className="footer__brand">
            <Brand to="/" />
            <p className="footer__tag">Made for curious minds.</p>
          </div>
          <div>
            <h2 className="footer__heading">Product</h2>
            <div className="footer__column">
              <a href="#features">Features</a>
              <a href="#how-it-works">How it works</a>
              <a href="#pricing">Pricing</a>
            </div>
          </div>
          <div>
            <h2 className="footer__heading">For you</h2>
            <div className="footer__column">
              <a href="#who-its-for">Students</a>
              <a href="#who-its-for">Researchers</a>
              <a href="#who-its-for">Creators</a>
            </div>
          </div>
          <div>
            <h2 className="footer__heading">Workflow</h2>
            <div className="footer__column">
              <a href="#how-it-works">Ingest a video</a>
              <a href="#features">Choose a scope</a>
              <a href="#features">Read citations</a>
            </div>
          </div>
          <div>
            <h2 className="footer__heading">Get started</h2>
            <div className="footer__column">
              <Link to="/c/new">Open app</Link>
              <Link to="/signin">Sign in</Link>
              <Link to="/ingest#library">Your library</Link>
            </div>
          </div>
          <div>
            <h2 className="footer__heading">The promise</h2>
            <div className="footer__column">
              <span>Answers grounded in what actually was said.</span>
            </div>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© 2026 yt_bot</span>
          <span>Transcripts in. Useful answers out.</span>
        </div>
      </div>
    </footer>
  )
}

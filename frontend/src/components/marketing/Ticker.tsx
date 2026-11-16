import { useState } from 'react'

const ITEMS = [
  'transcripts become searchable',
  'answers include timestamped citations',
  'one playlist, one shared scope',
  'skip the rewatching',
  'ask your library anything',
]

function TickerGroup({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="ticker__group" aria-hidden={hidden || undefined}>
      {ITEMS.map((item) => (
        <span key={item} className="ticker__item">
          <span>{item}</span>
          <span className="ticker__dot" aria-hidden="true">•</span>
        </span>
      ))}
    </div>
  )
}

export default function Ticker() {
  const [paused, setPaused] = useState(false)

  return (
    <div className={`ticker ${paused ? 'is-paused' : ''}`} aria-label="Product highlights">
      <div className="ticker__viewport">
        <div className="ticker__track">
          <TickerGroup />
          <TickerGroup hidden />
        </div>
      </div>
      <button
        type="button"
        className="ticker__control"
        aria-pressed={paused}
        aria-label={paused ? 'Resume product ticker' : 'Pause product ticker'}
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? 'Play' : 'Pause'}
      </button>
    </div>
  )
}

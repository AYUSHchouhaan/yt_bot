import { cn } from '../../lib/cn'
import { Tag } from '../ui/Chip'

export default function HeroBoard({ className }: { className?: string }) {
  return (
    <div className={cn('board', className)}>
      <span className="board__label">YOUR LIBRARY, READY</span>
      <article className="note note--1">
        <span className="note__tape" aria-hidden="true" />
        <Tag>NEW VIDEO</Tag>
        <p className="note__title">“How I built a second brain”</p>
        <p className="note__meta">just now · transcript ready to explore</p>
      </article>
      <article className="note note--2">
        <span className="note__tape" aria-hidden="true" />
        <Tag>PLAYLIST SCOPE</Tag>
        <p className="note__title">The complete design course</p>
        <p className="note__meta">12 videos · one shared conversation</p>
      </article>
      <article className="note note--3">
        <span className="note__tape" aria-hidden="true" />
        <Tag>CITED ANSWER</Tag>
        <p className="note__title">“The key idea is retrieval, not storage.” [1]</p>
        <p className="note__meta">08:42 · jump straight to the source</p>
      </article>
    </div>
  )
}

import { ExternalLink } from 'lucide-react'

import { formatTime, type Citation } from '../../lib/api'

export default function CitationChip({
  index,
  citation,
}: {
  index: number
  citation: Citation
}) {
  const youtubeId = citation.youtube_id
  const url = youtubeId
    ? `https://youtu.be/${youtubeId}?t=${Math.floor(citation.start_s)}`
    : null

  const tooltip = [
    citation.title ?? 'Untitled',
    formatTime(citation.start_s),
  ].join(' • ')

  const pill = (
    <span className="inline-flex items-center gap-0.5 rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-zinc-300 ring-1 ring-inset ring-zinc-700 transition-colors hover:bg-zinc-700 hover:text-zinc-100">
      [{index}]
      <ExternalLink className="h-3 w-3" />
    </span>
  )

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={tooltip}
        className="inline-flex"
      >
        {pill}
      </a>
    )
  }

  return (
    <span title={tooltip} className="inline-flex">
      {pill}
    </span>
  )
}

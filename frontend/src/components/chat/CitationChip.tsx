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

  const tooltip = [citation.title ?? 'Untitled', formatTime(citation.start_s)].join(' • ')
  const content = (
    <>
      <span>[{index}]</span>
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
    </>
  )

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={tooltip}
        aria-label={`Citation ${index}: ${tooltip}`}
        className="citation"
      >
        {content}
      </a>
    )
  }

  return (
    <span title={tooltip} className="citation">
      {content}
    </span>
  )
}

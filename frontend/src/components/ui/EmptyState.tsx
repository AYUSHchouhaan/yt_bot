import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  reassurance?: string
  action?: ReactNode
  headingLevel?: 1 | 2
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  reassurance,
  action,
  headingLevel = 2,
}: EmptyStateProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'

  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Icon aria-hidden="true" />
      </div>
      <Heading className="empty-state__title">{title}</Heading>
      <p className="empty-state__description">{description}</p>
      {reassurance && <p className="empty-state__reassurance">{reassurance}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}

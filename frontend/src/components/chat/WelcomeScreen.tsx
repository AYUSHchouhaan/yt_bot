import { ListVideo, Search, Sparkles } from 'lucide-react'

import Brand from '../ui/Brand'
import Eyebrow from '../ui/Eyebrow'

const PROMPTS = [
  {
    icon: Sparkles,
    title: 'Summarize the big ideas',
    prompt: 'Summarize the key ideas across my library.',
  },
  {
    icon: Search,
    title: 'Find a specific moment',
    prompt: 'Find the part of my videos that explains the main topic in detail.',
  },
  {
    icon: ListVideo,
    title: 'Compare the sources',
    prompt: 'Compare what these videos say about the same idea.',
  },
]

export default function WelcomeScreen({
  onSuggestion,
}: {
  onSuggestion: (prompt: string) => void
}) {
  return (
    <section className="welcome-screen" aria-labelledby="welcome-title">
      <div className="welcome-screen__inner">
        <div className="welcome-screen__mark" aria-hidden="true">
          <Brand showWordmark={false} />
        </div>
        <Eyebrow>your library is listening</Eyebrow>
        <h1 id="welcome-title" className="welcome-screen__title">
          What do you want to know?
        </h1>
        <p className="welcome-screen__lede">
          Ask across your whole library or focus on one video. Answers come
          back with timestamped receipts.
        </p>
        <div className="welcome-screen__prompts" aria-label="Suggested questions">
          {PROMPTS.map(({ icon: Icon, title, prompt }) => (
            <button
              key={title}
              type="button"
              className="welcome-suggestion"
              onClick={() => onSuggestion(prompt)}
            >
              <span className="welcome-suggestion__icon">
                <Icon aria-hidden="true" />
              </span>
              <span className="welcome-suggestion__title">{title}</span>
              <span className="welcome-suggestion__body">{prompt}</span>
            </button>
          ))}
        </div>
        <p className="welcome-screen__hint">Start typing below, or pick a prompt.</p>
      </div>
    </section>
  )
}

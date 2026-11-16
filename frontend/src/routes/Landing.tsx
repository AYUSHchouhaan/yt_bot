import Card from '../components/ui/Card'
import Eyebrow from '../components/ui/Eyebrow'
import { ButtonLink } from '../components/ui/Button'
import MarketingHeader from '../components/marketing/MarketingHeader'
import Ticker from '../components/marketing/Ticker'
import HeroBoard from '../components/marketing/HeroBoard'
import MarketingFooter from '../components/marketing/MarketingFooter'

const FEATURES = [
  {
    emoji: '📼',
    title: 'Drop in a link',
    body: 'Bring a single video or an entire playlist. yt_bot prepares the transcripts and keeps your library ready for questions.',
    tone: 'warm' as const,
  },
  {
    emoji: '🎯',
    title: 'Choose the conversation',
    body: 'Ask across everything, focus on one video, or work through a playlist. The scope is always clear before you send.',
    tone: 'cool' as const,
  },
  {
    emoji: '📍',
    title: 'Follow the evidence',
    body: 'Every useful answer points back to the transcript. Open a citation and land at the exact moment it came from.',
    tone: 'blush' as const,
  },
]

const PERSONAS = [
  { emoji: '🎓', title: 'Students', body: 'Turn lectures into study notes, explanations, and quick revision sessions.' },
  { emoji: '🔎', title: 'Researchers', body: 'Compare claims across long interviews without losing the original context.' },
  { emoji: '🎬', title: 'Creators', body: 'Revisit your own catalog and find the ideas worth developing next.' },
  { emoji: '🧠', title: 'Curious viewers', body: 'Spend less time scrubbing and more time understanding what you watched.' },
]

const STEPS = [
  { title: 'Ingest your sources', body: 'Paste a YouTube video or playlist URL. We handle the transcript preparation behind the scenes.' },
  { title: 'Ask a real question', body: 'Pick your scope and ask naturally, from broad summaries to very specific details.' },
  { title: 'Check the source', body: 'Use timestamped citations to jump back into YouTube and verify the answer for yourself.' },
]

export default function Landing() {
  return (
    <div id="top">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <MarketingHeader />
      <Ticker />
      <main id="main-content">
        <section className="shell hero" aria-labelledby="hero-title">
          <div>
            <Eyebrow className="reveal reveal--d1">your watch history, with a memory 🔎</Eyebrow>
            <h1 id="hero-title" className="hero__title reveal reveal--d2">
              Ask your <span className="squiggle">YouTube library</span> anything.
            </h1>
            <p className="hero__lede reveal reveal--d3">
              yt_bot turns videos and playlists into a searchable conversation.
              Ingest a link, choose your scope, and get answers grounded in the
              transcript with timestamped citations.
            </p>
            <div className="hero__actions reveal reveal--d4">
              <ButtonLink to="/c/new">Ask your library</ButtonLink>
              <ButtonLink to="#how-it-works" variant="ghost">See how it works</ButtonLink>
            </div>
            <p className="reassurance reveal reveal--d6">
              Free to start · sign in with Google · no credit card
            </p>
          </div>
          <div className="reveal reveal--d5">
            <HeroBoard />
          </div>
        </section>

        <section id="features" className="section">
          <div className="shell">
            <div className="section-head">
              <Eyebrow>less scrubbing, more knowing</Eyebrow>
              <h2>A smarter way back into what you watched</h2>
              <p>Your library becomes useful again when you can question it.</p>
            </div>
            <div className="grid gap-[26px] min-[880px]:grid-cols-3">
              {FEATURES.map((feature) => (
                <Card key={feature.title} tone={feature.tone} interactive>
                  <span className="card__emoji" aria-hidden="true">{feature.emoji}</span>
                  <h3 className="card__title">{feature.title}</h3>
                  <p className="card__body">{feature.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="who-its-for" className="section section--ink">
          <div className="shell">
            <div className="section-head">
              <Eyebrow>built for the endlessly curious</Eyebrow>
              <h2>One library. Plenty of ways to use it.</h2>
              <p>From exam prep to your next big idea, start with the videos you already value.</p>
            </div>
            <div className="grid gap-5 min-[520px]:grid-cols-2 min-[880px]:grid-cols-4">
              {PERSONAS.map((persona) => (
                <article key={persona.title} className="persona">
                  <span className="persona__emoji" aria-hidden="true">{persona.emoji}</span>
                  <h3>{persona.title}</h3>
                  <p>{persona.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section">
          <div className="shell">
            <div className="section-head">
              <Eyebrow>three steps to the good part</Eyebrow>
              <h2>From “I watched that” to “here’s the answer”</h2>
              <p>No new filing system. No manual notes. Just a better conversation with your sources.</p>
            </div>
            <div className="grid gap-x-6 gap-y-8 min-[880px]:grid-cols-3">
              {STEPS.map((step, index) => (
                <article key={step.title} className="step">
                  <span className={`step__number step__number--${index + 1}`}>{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="cta-section">
          <div className="shell">
            <div className="cta">
              <span className="cta__watermark" aria-hidden="true">↗</span>
              <Eyebrow>start with one video</Eyebrow>
              <h2>Your next answer is already in your library.</h2>
              <p>Open yt_bot for free, sign in with Google, and ask your first grounded question.</p>
              <ButtonLink to="/c/new">Open the app</ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}

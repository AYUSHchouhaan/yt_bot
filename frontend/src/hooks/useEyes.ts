import { useEffect, type RefObject } from 'react'

const MAX_OFFSET = 6
const REACH = 140

export default function useEyes(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const coarsePointer = window.matchMedia('(pointer: coarse)')
    if (!root || reducedMotion.matches || coarsePointer.matches) return

    const eyes = Array.from(root.querySelectorAll<HTMLElement>('.eye'))

    function trackEyes(event: MouseEvent) {
      for (const eye of eyes) {
        const rect = eye.getBoundingClientRect()
        const dx = event.clientX - (rect.left + rect.width / 2)
        const dy = event.clientY - (rect.top + rect.height / 2)
        const distance = Math.hypot(dx, dy) || 1
        const reach = Math.min(distance, REACH) / REACH
        eye.style.setProperty('--px', `${(dx / distance) * MAX_OFFSET * reach}px`)
        eye.style.setProperty('--py', `${(dy / distance) * MAX_OFFSET * reach}px`)
      }
    }

    window.addEventListener('mousemove', trackEyes, { passive: true })
    return () => window.removeEventListener('mousemove', trackEyes)
  }, [ref])
}

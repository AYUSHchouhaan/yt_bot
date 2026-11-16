/**
 * Deterministic label truncation: first few characters, then an
 * ellipsis — stable at any panel width.
 */
export function truncateLabel(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

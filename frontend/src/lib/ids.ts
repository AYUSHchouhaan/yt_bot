/**
 * Random 18–24 digit numeric chat ID, generated client-side.
 * No sequential component — collisions at ~10^18 keyspace are
 * practically impossible; the backend unique constraint is the
 * final guard (409 → regenerate and retry).
 */
export function newChatId(): string {
  const bytes = new Uint32Array(2)
  crypto.getRandomValues(bytes)
  const length = 18 + (bytes[0] % 7)
  const rest = new Uint32Array(length - 1)
  crypto.getRandomValues(rest)
  let id = String(1 + (bytes[1] % 9))
  for (let i = 0; i < rest.length; i++) {
    id += String(rest[i] % 10)
  }
  return id
}

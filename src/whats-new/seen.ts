import { RELEASES, type Release } from './releases'

const STORAGE_KEY = 'toptraining.seenRelease'

export function readSeenRelease(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function markReleasesSeen(): void {
  const latest = RELEASES[0]?.id
  if (!latest) return
  try {
    localStorage.setItem(STORAGE_KEY, latest)
  } catch {
    /* sin storage no hay forma de no molestar de nuevo */
  }
}

/**
 * Parches que este dispositivo todavía no vio. `null` en storage = nunca
 * pasó por acá: se muestran todos (el usuario que ya estaba recibe el
 * primero; el que termina el onboarding se marca visto antes de llegar).
 */
export function unseenReleases(): Release[] {
  const seen = readSeenRelease()
  if (seen === null) return [...RELEASES]
  const index = RELEASES.findIndex((release) => release.id === seen)
  if (index === -1) return [...RELEASES]
  return RELEASES.slice(0, index)
}

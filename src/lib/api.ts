/** Cliente HTTP del API de Top Training. Siempre manda la cookie de sesión. */

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(body?.error ?? 'Algo salió mal', res.status)
  }
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
}

/* --- Tipos compartidos con el backend ------------------------------------ */

export type TrainingSlot = 'morning' | 'afternoon' | 'night'

export interface Profile {
  id: string
  name: string
  email: string
  image: string | null
  theme: string
  trainingSlot: TrainingSlot | null
  targetWeightKg: number | null
  weeklyFrequency: number | null
  friendCode: string
  onboardingCompleted: boolean
}

export interface Friend {
  id: string
  name: string
  image: string | null
  friendCode: string
}

/** Cómo estás parado con alguien que aparece en la búsqueda. */
export type Relation = 'none' | 'pending_out' | 'pending_in' | 'friends'

export interface SearchResult extends Friend {
  relation: Relation
}

export interface FriendRequest {
  id: string
  createdAt: string
  user: Friend
}

export interface FriendRequests {
  /** Las que te mandaron y tenés que responder. */
  incoming: FriendRequest[]
  /** Las que mandaste y están esperando. */
  outgoing: FriendRequest[]
}

export type BaseGoal = 3 | 4 | 5

export interface Group {
  id: string
  name: string
  baseGoal: number
  inviteCode: string
  memberCount: number
  isOwner: boolean
  /** Meta propia dentro del grupo; null = hereda la del grupo. */
  personalGoal: number | null
  /** personalGoal ?? baseGoal — lo que realmente te exige el grupo. */
  effectiveGoal: number
}

export interface GroupMemberView extends Friend {
  role: string
  personalGoal: number | null
  effectiveGoal: number
  isMe: boolean
}

export interface GroupDetail extends Group {
  members: GroupMemberView[]
}

export interface CheckIn {
  id: string
  userId: string
  day: string
  note: string | null
  photoUrl: string | null
  photoPublicId: string | null
  createdAt: string
}

/** Rachas derivadas de los check-ins. No se guardan: las calcula el servidor. */
export interface Streaks {
  /** Días consecutivos con check-in. */
  daily: number
  /** Semanas consecutivas cumpliendo la meta. */
  weekly: number
  /** Meta semanal usada para calcular `weekly`. */
  goal: number
}

export interface FriendWithStreaks extends Friend {
  streaks: Streaks
}

export interface FeedItem {
  id: string
  day: string
  note: string | null
  photoUrl: string | null
  createdAt: string
  commentCount: number
  author: Friend
  streaks: Streaks
}

export interface FeedPage {
  items: FeedItem[]
  nextCursor: string | null
}

export type WeekStatus = 'met' | 'missed' | 'current' | 'future'

export interface WeekSummary {
  start: string
  count: number
  goal: number
  met: boolean
  status: WeekStatus
}

export interface CalendarCheckIn {
  id: string
  day: string
  note: string | null
  photoUrl: string | null
}

export interface CalendarData {
  month: string
  userId: string
  goal: number
  usesPersonalGoal: boolean
  gridStart: string
  gridEnd: string
  checkIns: CalendarCheckIn[]
  weeks: WeekSummary[]
}

export interface Comment {
  id: string
  body: string
  createdAt: string
  user: Friend
}

export interface CheckInDetail extends CheckIn {
  user: Friend
  comments: Comment[]
}

export interface AppConfig {
  providers: string[]
  /** false si el servidor no tiene Cloudinary: la app esconde la foto. */
  photoUploads: boolean
}

export interface UploadSignature {
  cloudName: string
  apiKey: string
  folder: string
  publicId: string
  timestamp: number
  signature: string
  uploadUrl: string
}

/** Día local en formato YYYY-MM-DD (el server no adivina la zona horaria). */
export function localDay(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

/** Mes local en formato YYYY-MM. */
export function localMonth(date = new Date()): string {
  return localDay(date).slice(0, 7)
}

/** Corre un día "YYYY-MM-DD" sin pasar por zonas horarias. */
export function shiftDay(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, date! + days)).toISOString().slice(0, 10)
}

/**
 * Timestamp relativo en la voz de la app: corto y sin vueltas.
 * "recién", "hace 3 h", "hace 2 días", "hace 3 semanas".
 */
export function relativeTime(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'recién'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return weeks === 1 ? 'hace 1 semana' : `hace ${weeks} semanas`
  const months = Math.floor(days / 30)
  return months === 1 ? 'hace 1 mes' : `hace ${months} meses`
}

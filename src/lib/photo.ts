import { ApiError } from './api'

/**
 * Foto del check-in: la achicamos en el teléfono y la mandamos a nuestro API,
 * que la guarda en R2. El browser no habla con el bucket (Safari, sin CORS,
 * reporta ese PUT como "Load failed").
 *
 * Comprimir antes de subir no es un lujo: una foto de cámara moderna pesa
 * 4–8 MB y con datos móviles eso es la diferencia entre un check-in de dos
 * segundos y uno que se abandona a la mitad.
 *
 * Las miniaturas no se suben: las recorta Cloudflare Images a partir del
 * original (`/cdn-cgi/image/...`). En local, sin zona, se sirve el JPEG
 * entero.
 */

const MAX_SIDE = 1600
const QUALITY = 0.82
/** Hasta 3 fotos por check-in. El slot va en el key de R2. */
export const MAX_CHECKIN_PHOTOS = 3

/** Lo manda GET /api/config. Vacío = no transformar (dev). */
let transformBase: string | null = null

export function setImageTransformBase(base: string | null): void {
  transformBase = base?.replace(/\/+$/, '') || null
}

/** Redimensiona y recomprime a JPEG. */
export async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas')
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    )
    if (blob) return blob
  } catch {
    /* caemos al original solo si ya es JPEG */
  }
  if (file.type === 'image/jpeg') return file
  throw new Error('No pudimos leer esa foto')
}

export interface UploadedPhoto {
  url: string
  publicId: string
}

/** Sube la foto vía el API. La clave de R2 nunca sale del servidor. */
export async function uploadCheckInPhoto(file: File, day: string, slot = 0): Promise<UploadedPhoto> {
  const image = await compressImage(file)
  const response = await fetch('/api/uploads/checkin', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'image/jpeg',
      'X-Checkin-Day': day,
      'X-Checkin-Slot': String(slot),
    },
    body: image,
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(body?.error ?? 'No pudimos subir la foto', response.status)
  }
  const stored = (await response.json()) as { publicUrl: string; publicId: string }
  return { url: stored.publicUrl, publicId: stored.publicId }
}

/**
 * Miniatura via Cloudflare Images. El detalle (size grande) puede pedir
 * el original sin transformar: no gasta de los 5.000 únicos/mes.
 */
export function thumbnail(url: string, size = 400): string {
  if (!transformBase) return url
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  if (url.includes('/cdn-cgi/image/')) return url
  return `${transformBase}/width=${size},height=${size},fit=cover,quality=82,format=auto/${url}`
}

/** URLs de las fotos de un check-in o un ítem del feed. */
export function photoUrls(item: {
  photos?: Array<string | { url: string }> | null
  photoUrl?: string | null
}): string[] {
  if (item.photos && item.photos.length > 0) {
    return item.photos.map((photo) => (typeof photo === 'string' ? photo : photo.url)).filter(Boolean)
  }
  return item.photoUrl ? [item.photoUrl] : []
}

/**
 * Slot 0..2 que todavía no usa ninguna foto guardada. Las fotos viejas
 * (`..._YYYY-MM-DD.jpg`, sin slot) ocupan el 0.
 */
export function nextPhotoSlots(existingPublicIds: string[], needed: number): number[] {
  const used = new Set(
    existingPublicIds.map(slotFromPublicId).filter((slot): slot is number => slot !== null),
  )
  const slots: number[] = []
  for (let slot = 0; slot < MAX_CHECKIN_PHOTOS && slots.length < needed; slot++) {
    if (!used.has(slot)) slots.push(slot)
  }
  return slots
}

function slotFromPublicId(publicId: string): number | null {
  const slotted = publicId.match(/_\d{4}-\d{2}-\d{2}_([0-2])\.jpg$/)
  if (slotted) return Number(slotted[1])
  if (/_\d{4}-\d{2}-\d{2}\.jpg$/.test(publicId)) return 0
  return null
}

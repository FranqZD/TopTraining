import 'dotenv/config'
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

/**
 * Fotos de check-in en R2. Las miniaturas las recorta Cloudflare Images
 * (transformaciones sobre el original), no se guardan aparte.
 *
 * El teléfono manda el JPEG a nuestro API y este servidor lo pone en R2.
 * Así no hace falta CORS en el bucket (Safari reporta ese fallo como
 * "Load failed") y la clave secreta nunca sale de acá.
 */

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const BUCKET = process.env.R2_BUCKET
const PUBLIC_BASE = stripSlash(process.env.R2_PUBLIC_URL ?? '')
/** Zona con Image Transformations. Vacío en local: el feed sirve el original. */
export const imageTransformBase = stripSlash(process.env.IMAGE_TRANSFORM_BASE ?? '') || null

const PREFIX = 'checkins'
const CONTENT_TYPE = 'image/jpeg'
/** Hasta 3 fotos por check-in. El slot va en el key de R2. */
export const MAX_CHECKIN_PHOTOS = 3
/** Viejo: /checkins/user_YYYY-MM-DD.jpg · nuevo: ..._YYYY-MM-DD_0.jpg */
const PHOTO_PATH = /^\/checkins\/[^/]+_\d{4}-\d{2}-\d{2}(?:_[0-2])?\.jpg$/

export const storageConfigured = Boolean(
  ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET && PUBLIC_BASE,
)

let client: S3Client | null = null

function r2(): S3Client {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: ACCESS_KEY_ID!,
        secretAccessKey: SECRET_ACCESS_KEY!,
      },
      // AWS SDK v3 firma CRC32 por default y R2 lo rechaza.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    })
  }
  return client
}

export interface StoredPhoto {
  /** Lo que se guarda en CheckIn.photoUrl / photos[].url. */
  publicUrl: string
  /** Key del objeto. Va en CheckIn.photos[].publicId para poder borrar. */
  publicId: string
}

export interface CheckInPhoto {
  url: string
  publicId: string
}

/**
 * Sube el JPEG de un check-in.
 *
 * El key lo fijamos nosotros (`checkins/<userId>_<día>_<slot>.jpg`): el
 * cliente no puede pisar la foto de otro. El slot (0..2) es lo que permite
 * tres fotos del mismo día sin pisarse.
 */
export async function putCheckInPhoto(
  userId: string,
  day: string,
  body: Buffer,
  slot = 0,
): Promise<StoredPhoto> {
  if (!storageConfigured) throw new Error('R2 no está configurado')

  const safeSlot = Math.min(MAX_CHECKIN_PHOTOS - 1, Math.max(0, Math.floor(slot)))
  const publicId = `${PREFIX}/${userId}_${day}_${safeSlot}.jpg`
  await r2().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: publicId,
      ContentType: CONTENT_TYPE,
      Body: body,
    }),
  )

  return {
    publicUrl: `${PUBLIC_BASE}/${publicId}`,
    publicId,
  }
}

/**
 * El cliente nos manda la URL pública. Antes de guardarla comprobamos que
 * sea de nuestro bucket y de nuestra carpeta: si no, cualquiera podría
 * guardar un link a un servidor ajeno en su check-in.
 */
export function isOwnPhotoUrl(url: string): boolean {
  if (!storageConfigured) return false
  try {
    const parsed = new URL(url)
    const expected = new URL(PUBLIC_BASE)
    return (
      parsed.protocol === expected.protocol &&
      parsed.host === expected.host &&
      PHOTO_PATH.test(parsed.pathname)
    )
  } catch {
    return false
  }
}

/**
 * Borra el objeto de R2. Se llama al quitar la foto de un check-in o al
 * deshacerlo entero: si no, el archivo queda ocupando el bucket para siempre.
 *
 * Nunca hace fallar la operación de arriba — que la foto sobreviva un borrado
 * es feo, pero bloquear al usuario por eso es peor.
 */
export async function deletePhoto(publicId: string): Promise<void> {
  if (!storageConfigured) return
  try {
    await r2().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: publicId }))
  } catch (error) {
    console.error('[storage] no se pudo borrar la foto:', publicId, error)
  }
}

/**
 * Lista de fotos de un check-in. Si `photos` no está (filas viejas), se
 * usa `photoUrl` como lista de una.
 */
export function parseCheckInPhotos(row: {
  photos?: string | null
  photoUrl?: string | null
  photoPublicId?: string | null
}): CheckInPhoto[] {
  if (row.photos) {
    try {
      const parsed: unknown = JSON.parse(row.photos)
      if (Array.isArray(parsed)) {
        const photos: CheckInPhoto[] = []
        for (const item of parsed) {
          if (!item || typeof item !== 'object') continue
          const url = (item as { url?: unknown }).url
          const publicId = (item as { publicId?: unknown }).publicId
          if (typeof url === 'string' && typeof publicId === 'string' && url && publicId) {
            photos.push({ url, publicId })
          }
          if (photos.length === MAX_CHECKIN_PHOTOS) break
        }
        if (photos.length > 0) return photos
      }
    } catch {
      /* caemos al campo viejo */
    }
  }
  if (row.photoUrl) return [{ url: row.photoUrl, publicId: row.photoPublicId ?? '' }]
  return []
}

/** Lo que se escribe en la fila: JSON + primera foto para lecturas viejas. */
export function persistPhotos(photos: CheckInPhoto[]): {
  photos: string | null
  photoUrl: string | null
  photoPublicId: string | null
} {
  const next = photos.slice(0, MAX_CHECKIN_PHOTOS)
  const first = next[0]
  return {
    photos: next.length > 0 ? JSON.stringify(next) : null,
    photoUrl: first?.url ?? null,
    photoPublicId: first?.publicId ?? null,
  }
}

export function publicPhotos(row: {
  photos?: string | null
  photoUrl?: string | null
  photoPublicId?: string | null
}): { photos: CheckInPhoto[]; photoUrl: string | null; photoPublicId: string | null } {
  const photos = parseCheckInPhotos(row)
  return {
    photos,
    photoUrl: photos[0]?.url ?? null,
    photoPublicId: photos[0]?.publicId ?? null,
  }
}

export function feedPhotoFields(row: {
  photos?: string | null
  photoUrl?: string | null
  photoPublicId?: string | null
}): { photos: string[]; photoUrl: string | null } {
  const urls = parseCheckInPhotos(row).map((photo) => photo.url)
  return { photos: urls, photoUrl: urls[0] ?? null }
}

/** Borra de R2 las fotos que ya no están en la lista nueva. */
export async function deleteRemovedPhotos(before: CheckInPhoto[], after: CheckInPhoto[]): Promise<void> {
  const keep = new Set(after.map((photo) => photo.publicId).filter(Boolean))
  await Promise.all(
    before.filter((photo) => photo.publicId && !keep.has(photo.publicId)).map((photo) => deletePhoto(photo.publicId)),
  )
}

function stripSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

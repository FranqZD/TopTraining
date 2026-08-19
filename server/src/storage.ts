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
  /** Lo que se guarda en CheckIn.photoUrl. */
  publicUrl: string
  /** Key del objeto. Va en CheckIn.photoPublicId para poder borrar. */
  publicId: string
}

/**
 * Sube el JPEG de un check-in.
 *
 * El key lo fijamos nosotros (`checkins/<userId>_<día>.jpg`): el cliente no
 * puede pisar la foto de otro. Como el nombre es determinístico, rehacer la
 * foto del mismo día sobreescribe en vez de dejar archivos huérfanos.
 */
export async function putCheckInPhoto(
  userId: string,
  day: string,
  body: Buffer,
): Promise<StoredPhoto> {
  if (!storageConfigured) throw new Error('R2 no está configurado')

  const publicId = `${PREFIX}/${userId}_${day}.jpg`
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
      /^\/checkins\/[^/]+_\d{4}-\d{2}-\d{2}\.jpg$/.test(parsed.pathname)
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

function stripSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

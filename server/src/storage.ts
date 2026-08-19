import 'dotenv/config'
import { v2 as cloudinary } from 'cloudinary'

/**
 * Fotos de check-in en Cloudinary.
 *
 * Elegí Cloudinary sobre S3 porque no hay que crear bucket, política IAM ni
 * configurar CORS: con tres variables de entorno ya sube, y encima sirve las
 * imágenes optimizadas y redimensionadas sin infraestructura extra.
 *
 * El navegador sube DIRECTO a Cloudinary con una firma que emite este servidor.
 * Así los bytes de la foto no pasan por nuestro API (menos latencia en el paso
 * más pesado del check-in) y la clave secreta nunca sale de acá.
 */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME
const API_KEY = process.env.CLOUDINARY_API_KEY
const API_SECRET = process.env.CLOUDINARY_API_SECRET

/** Carpeta donde caen todas las fotos de check-in. */
export const UPLOAD_FOLDER = 'toptraining/checkins'

export const storageConfigured = Boolean(CLOUD_NAME && API_KEY && API_SECRET)

if (storageConfigured) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true,
  })
}

export interface UploadSignature {
  cloudName: string
  apiKey: string
  folder: string
  /** El cliente tiene que mandar exactamente este public_id: va firmado. */
  publicId: string
  timestamp: number
  signature: string
  uploadUrl: string
}

/**
 * Firma una subida para un usuario concreto.
 *
 * `public_id` lo fijamos nosotros (usuario + día) y va firmado: el cliente no
 * puede subir a un nombre arbitrario ni pisar la foto de otro. Como el nombre
 * es determinístico, rehacer la foto del mismo día sobreescribe en vez de
 * dejar archivos huérfanos dando vueltas.
 */
export function createUploadSignature(userId: string, day: string): UploadSignature {
  if (!storageConfigured) throw new Error('Cloudinary no está configurado')

  const timestamp = Math.round(Date.now() / 1000)
  const publicId = `${userId}_${day}`

  const signature = cloudinary.utils.api_sign_request(
    { folder: UPLOAD_FOLDER, public_id: publicId, timestamp, overwrite: 'true', invalidate: 'true' },
    API_SECRET!,
  )

  return {
    cloudName: CLOUD_NAME!,
    apiKey: API_KEY!,
    folder: UPLOAD_FOLDER,
    publicId,
    timestamp,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
  }
}

/**
 * El cliente nos manda la URL que le devolvió Cloudinary. Antes de guardarla
 * comprobamos que sea realmente de nuestra cuenta y de nuestra carpeta: si no,
 * cualquiera podría guardar un link a un servidor ajeno en su check-in.
 */
export function isOwnCloudinaryUrl(url: string): boolean {
  if (!storageConfigured) return false
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'res.cloudinary.com' &&
      parsed.pathname.startsWith(`/${CLOUD_NAME}/`) &&
      parsed.pathname.includes(UPLOAD_FOLDER)
    )
  } catch {
    return false
  }
}

/**
 * Borra la foto de Cloudinary. Se llama al quitar la foto de un check-in o al
 * deshacerlo entero: si no, el archivo queda pagando alojamiento para siempre.
 *
 * Nunca hace fallar la operación de arriba — que la foto sobreviva un borrado
 * es feo, pero bloquear al usuario por eso es peor.
 */
export async function deletePhoto(publicId: string): Promise<void> {
  if (!storageConfigured) return
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true })
  } catch (error) {
    console.error('[storage] no se pudo borrar la foto:', publicId, error)
  }
}

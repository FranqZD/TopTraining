import { api, type UploadSignature } from './api'

/**
 * Foto del check-in: la achicamos en el teléfono y la subimos directo a R2
 * con un PUT prefirmado que emite nuestro servidor.
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

/** Lo manda GET /api/config. Vacío = no transformar (dev). */
let transformBase: string | null = null

export function setImageTransformBase(base: string | null): void {
  transformBase = base?.replace(/\/+$/, '') || null
}

/** Redimensiona y recomprime a JPEG. Si algo falla, devuelve el original. */
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
    if (!context) return file
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    )
    // Si comprimir no ayudó, nos quedamos con el original.
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

export interface UploadedPhoto {
  url: string
  publicId: string
}

/** Sube la foto a R2. La clave secreta nunca sale del servidor. */
export async function uploadCheckInPhoto(file: File, day: string): Promise<UploadedPhoto> {
  const signature = await api.post<UploadSignature>('/uploads/checkin-signature', { day })
  const image = await compressImage(file)

  const response = await fetch(signature.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': signature.contentType },
    body: image,
  })
  if (!response.ok) throw new Error('No pudimos subir la foto')

  return { url: signature.publicUrl, publicId: signature.publicId }
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

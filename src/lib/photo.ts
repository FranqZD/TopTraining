import { api, type UploadSignature } from './api'

/**
 * Foto del check-in: la achicamos en el teléfono y la subimos directo a
 * Cloudinary con una firma que emite nuestro servidor.
 *
 * Comprimir antes de subir no es un lujo: una foto de cámara moderna pesa
 * 4–8 MB y con datos móviles eso es la diferencia entre un check-in de dos
 * segundos y uno que se abandona a la mitad.
 */

const MAX_SIDE = 1600
const QUALITY = 0.82

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

/** Sube la foto a Cloudinary. La clave secreta nunca sale del servidor. */
export async function uploadCheckInPhoto(file: File, day: string): Promise<UploadedPhoto> {
  const signature = await api.post<UploadSignature>('/uploads/checkin-signature', { day })
  const image = await compressImage(file)

  const form = new FormData()
  form.append('file', image)
  form.append('api_key', signature.apiKey)
  form.append('timestamp', String(signature.timestamp))
  form.append('signature', signature.signature)
  // Estos tres van firmados: tienen que viajar idénticos o Cloudinary rechaza.
  form.append('folder', signature.folder)
  form.append('public_id', signature.publicId)
  form.append('overwrite', 'true')
  form.append('invalidate', 'true')

  const response = await fetch(signature.uploadUrl, { method: 'POST', body: form })
  if (!response.ok) throw new Error('No pudimos subir la foto')

  const result = (await response.json()) as { secure_url: string; public_id: string }
  return { url: result.secure_url, publicId: result.public_id }
}

/** Miniatura servida por Cloudinary, recortada y optimizada en el CDN. */
export function thumbnail(url: string, size = 400): string {
  return url.replace('/image/upload/', `/image/upload/c_fill,w_${size},h_${size},q_auto,f_auto/`)
}

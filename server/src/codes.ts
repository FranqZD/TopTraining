import { prisma } from './db.js'

/** Sin 0/O/1/I/L: los códigos se dictan en voz alta y se tipean a mano. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function randomCode(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let out = ''
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length]
  return out
}

/** Genera un código y reintenta mientras esté tomado. */
async function uniqueCode(length: number, isTaken: (code: string) => Promise<boolean>): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode(length)
    if (!(await isTaken(code))) return code
  }
  throw new Error('No se pudo generar un código único')
}

/** Código personal de amistad (6 caracteres). */
export function generateFriendCode(): Promise<string> {
  return uniqueCode(6, async (code) =>
    Boolean(await prisma.user.findUnique({ where: { friendCode: code }, select: { id: true } })),
  )
}

/** Código de invitación de un grupo (6 caracteres, mismo alfabeto). */
export function generateGroupCode(): Promise<string> {
  return uniqueCode(6, async (code) =>
    Boolean(await prisma.group.findUnique({ where: { inviteCode: code }, select: { id: true } })),
  )
}

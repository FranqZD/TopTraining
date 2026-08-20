/**
 * El login es usuario + contraseña. better-auth igual exige un email interno:
 * lo inventamos a partir del usuario y nunca se lo mostramos a nadie.
 */

const USERNAME = /^[a-z0-9._]{3,20}$/
const AUTH_EMAIL_DOMAIN = 'users.toptraining.app'

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isUsername(raw: string): boolean {
  return USERNAME.test(normalizeUsername(raw))
}

/** Si pegaron un correo (cuentas viejas), se respeta. Si no, se sintetiza. */
export function toAuthEmail(raw: string): string {
  const value = raw.trim()
  if (value.includes('@')) return value.toLowerCase()
  return `${normalizeUsername(value)}@${AUTH_EMAIL_DOMAIN}`
}

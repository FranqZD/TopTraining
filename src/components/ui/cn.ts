/** Une clases condicionales sin traer una dependencia para tres líneas. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

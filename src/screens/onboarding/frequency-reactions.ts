/**
 * Reacción a la frecuencia semanal declarada. El tono escala: arranca
 * alentando, celebra el 5 y después se burla. Es la voz de Top Training.
 *
 * `tone` mapea a los colores de estado del sistema de diseño, así que la
 * reacción se repinta sola con la paleta que el usuario tenga elegida.
 */

export type ReactionTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

export interface FrequencyReaction {
  text: string
  /** Segunda línea, más chica: donde vive el chiste. */
  sub: string
  tone: ReactionTone
  /** El 5 es el sweet spot: se destaca con marco y glow. */
  highlight?: boolean
}

export const FREQUENCY_REACTIONS: Record<number, FrequencyReaction> = {
  1: { text: 'Apenas calentando', sub: 'Algo es algo. Todos empezamos por ahí.', tone: 'neutral' },
  2: { text: 'Ya vas agarrando ritmo', sub: 'Dos por semana ya es una costumbre.', tone: 'neutral' },
  3: { text: 'Nada mal', sub: 'Tres es el mínimo que de verdad se nota.', tone: 'accent' },
  4: { text: 'Le estás echando ganas', sub: 'Aquí ya empiezas a incomodar a tus amigos.', tone: 'accent' },
  5: { text: 'El punto perfecto', sub: 'Cinco y dos de descanso. Así se hace.', tone: 'success', highlight: true },
  6: { text: 'Ya te pasaste, campeón', sub: 'Tu almohada quiere hablar contigo.', tone: 'warning' },
  7: { text: 'Te vas a romper en pedazos', sub: 'Siete de siete. Nos vemos en el fisioterapeuta.', tone: 'danger' },
}

export const TONE_TEXT: Record<ReactionTone, string> = {
  neutral: 'text-ink-200',
  accent: 'text-accent-text',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

export const TONE_SURFACE: Record<ReactionTone, string> = {
  neutral: 'bg-ink-850 border-ink-700',
  accent: 'bg-accent-tint border-accent-line',
  success: 'bg-success-tint border-success/45 shadow-[0_10px_36px_-16px_var(--color-success)]',
  warning: 'bg-warning-tint border-warning/45',
  danger: 'bg-danger-tint border-danger/45',
}

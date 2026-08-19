/**
 * Catálogo de paletas de acento de Top Training.
 *
 * Es el espejo en TS de los bloques `:root[data-theme]` de src/styles/themes.css.
 * Los hex de acá se usan SOLO para dibujar las muestras del selector de tema
 * (donde hay que mostrar 5 paletas a la vez y por eso no alcanza con var(--...)).
 * En cualquier otro lado, los componentes usan las variables CSS del tema activo.
 *
 * `ThemeId` es el tipo que persiste el campo `theme` del modelo User.
 */

export const THEME_IDS = ['ember', 'voltage', 'plasma', 'magma', 'pulse'] as const

export type ThemeId = (typeof THEME_IDS)[number]

export const DEFAULT_THEME: ThemeId = 'ember'

export interface Palette {
  id: ThemeId
  /** Nombre visible en Ajustes / onboarding. */
  name: string
  /** Una línea con la actitud de la paleta, en la voz de la marca. */
  tagline: string
  /** Muestras para el selector. Deben coincidir con themes.css. */
  swatch: {
    accent: string
    onAccent: string
    success: string
    warning: string
    danger: string
  }
}

export const PALETTES: Palette[] = [
  {
    id: 'ember',
    name: 'Ember',
    tagline: 'Coral eléctrico. Sale humo.',
    swatch: { accent: '#FF4E33', onAccent: '#180502', success: '#23D18B', warning: '#FFC13D', danger: '#F4364C' },
  },
  {
    id: 'voltage',
    name: 'Voltage',
    tagline: 'Lima fluorescente. 220 volts.',
    swatch: { accent: '#C9F73C', onAccent: '#101600', success: '#2ED9A4', warning: '#FFA51F', danger: '#FF4A5E' },
  },
  {
    id: 'plasma',
    name: 'Plasma',
    tagline: 'Azul frío. Cero excusas.',
    swatch: { accent: '#3BA0FF', onAccent: '#00101F', success: '#23D18B', warning: '#FFB02E', danger: '#FF4A5E' },
  },
  {
    id: 'magma',
    name: 'Magma',
    tagline: 'Ámbar denso. Oro de medalla.',
    swatch: { accent: '#FFAE1A', onAccent: '#1A0F00', success: '#23D18B', warning: '#FF7A1A', danger: '#F4364C' },
  },
  {
    id: 'pulse',
    name: 'Pulse',
    tagline: 'Magenta de after. Sin vergüenza.',
    swatch: { accent: '#FF3D9A', onAccent: '#1A0210', success: '#23D18B', warning: '#FFB02E', danger: '#FF5C43' },
  },
]

export const PALETTES_BY_ID = Object.fromEntries(PALETTES.map((p) => [p.id, p])) as Record<ThemeId, Palette>

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value)
}

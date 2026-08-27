/**
 * Notas de cada parche. La id es lo que se guarda en el dispositivo: si el
 * usuario no la vio, la pantalla de "hay de nuevo" se abre sola.
 *
 * Orden: lo más nuevo primero. Para un parche nuevo, copiá un bloque arriba
 * con una id que no se haya usado (la fecha alcanza; el mismo día, un sufijo).
 * Checklist: DESIGN_SYSTEM.md §10.
 */

export type ReleaseIcon = 'camera' | 'bell' | 'ghost' | 'bar' | 'trophy' | 'pen' | 'lock'

export interface ReleaseItem {
  icon: ReleaseIcon
  title: string
  detail: string
}

export interface Release {
  id: string
  /** Visible en el tape, "27 ago 2026". */
  dateLabel: string
  title: string
  tagline: string
  items: ReleaseItem[]
}

export const RELEASES: Release[] = [
  {
    id: '2026.08.27-votes',
    dateLabel: '27 ago 2026',
    title: 'Votos que se ganan entrenando',
    tagline: 'Cuantos más entrenos, más auras y lauras.',
    items: [
      {
        icon: 'bar',
        title: 'Un aura y una laura por entreno',
        detail: 'Cada vez que marcás, ganás uno de cada para dar. No se gastan al día: se acumulan.',
      },
      {
        icon: 'lock',
        title: 'Al día siguiente, se queda',
        detail: 'El mismo día lo podés sacar o cambiar. Si pasó un día, ese voto ya no se mueve.',
      },
    ],
  },
  {
    id: '2026.08.27-posts',
    dateLabel: '27 ago 2026',
    title: 'Posts en el grupo',
    tagline: 'Decí algo sin marcar un entreno.',
    items: [
      {
        icon: 'pen',
        title: 'Escribí en el grupo',
        detail: 'Un post de texto, sin votos ni comentarios. No cuenta como entreno.',
      },
    ],
  },
  {
    id: '2026.08.27',
    dateLabel: '27 ago 2026',
    title: 'Fotos, votos y recap',
    tagline: 'Lo que pediste, sin vueltas.',
    items: [
      {
        icon: 'camera',
        title: 'Hasta 3 fotos por entreno',
        detail: 'Sacá o elegí hasta tres. En el feed se deslizan de costado.',
      },
      {
        icon: 'bell',
        title: 'Después de marcar, un aviso',
        detail: 'Te recuerda que ya podés votar los entrenos de tus amigos.',
      },
      {
        icon: 'ghost',
        title: 'Laura sin nombre',
        detail: 'El aviso de laura ya no dice quién. El chiste se queda.',
      },
      {
        icon: 'bar',
        title: 'La barra de votos se llena',
        detail: 'Un aura sola es toda verde. Mitad y mitad si empatan.',
      },
      {
        icon: 'trophy',
        title: 'Auras y lauras en el recap',
        detail: 'Arriba del trofeo ves lo que te dieron este mes.',
      },
    ],
  },
]

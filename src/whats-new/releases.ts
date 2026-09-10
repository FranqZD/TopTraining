/**
 * Notas de cada parche. La id es lo que se guarda en el dispositivo: si el
 * usuario no la vio, la pantalla de "hay de nuevo" se abre sola.
 *
 * Orden: lo más nuevo primero. Para un parche nuevo, copia un bloque arriba
 * con una id que no se haya usado (la fecha alcanza; el mismo día, un sufijo).
 * Checklist: DESIGN_SYSTEM.md §10.
 */

export type ReleaseIcon = 'camera' | 'bell' | 'ghost' | 'bar' | 'trophy' | 'pen' | 'lock' | 'flame' | 'user' | 'paw'

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
    id: '2026.09.01-recap-weeks',
    dateLabel: '1 sep 2026',
    title: 'El recap ya no pierde el día',
    tagline: 'Si el mes cortaba una semana, ese entreno ahora entra.',
    items: [
      {
        icon: 'trophy',
        title: 'La semana completa',
        detail:
          'Un entreno en la semana partida cuenta en el mes de esa semana. El número de arriba y las barras ya dicen lo mismo.',
      },
    ],
  },
  {
    id: '2026.08.27-pet-life',
    dateLabel: '27 ago 2026',
    title: 'Tu mascota, al día',
    tagline: 'Marca y se anima. Si no llegas a la meta, vuelve a empezar.',
    items: [
      {
        icon: 'paw',
        title: 'Hasta que marques',
        detail: 'Si todavía no marcas el día, se ve triste. Al marcar, revive.',
      },
      {
        icon: 'paw',
        title: 'Si no llegas, a nivel 1',
        detail:
          'Si la semana se cierra sin tu meta, se pone fallecida y el nivel vuelve a 1. Cumple otra vez y vuelve a crecer.',
      },
    ],
  },
  {
    id: '2026.08.27-pause-posts',
    dateLabel: '27 ago 2026',
    title: 'El grupo, otra vez entrenos',
    tagline: 'Escribir en el grupo se queda para después.',
    items: [
      {
        icon: 'pen',
        title: 'Sin posts de texto',
        detail: 'En el grupo ves los entrenos y los votos. Escribir un aviso vuelve más adelante.',
      },
    ],
  },
  {
    id: '2026.08.27-group-gear',
    dateLabel: '27 ago 2026',
    title: 'El grupo, en el engranaje',
    tagline: 'Código, tu meta y los miembros ya no ocupan el feed.',
    items: [
      {
        icon: 'lock',
        title: 'Un toque en ajustes',
        detail: 'Si no eres dueño, ves el código, tu meta y quién está. Si lo eres, el panel de siempre.',
      },
    ],
  },
  {
    id: '2026.08.27-pets',
    dateLabel: '27 ago 2026',
    title: 'Tu mascota',
    tagline: 'Vive en Inicio, debajo de tus grupos. Crece si cumples la meta.',
    items: [
      {
        icon: 'paw',
        title: 'Escoge y ponle nombre',
        detail: 'Gota, gema, ave, planta o bonsái. Elige y nómbrala una vez: después no se cambia. El nivel sube cada vez que cierras tu meta semanal.',
      },
      {
        icon: 'paw',
        title: 'Vive con tu semana',
        detail: 'Hasta que marques, se ve triste. Si no llegas a la meta, vuelve a nivel 1.',
      },
    ],
  },
  {
    id: '2026.08.27-wallet',
    dateLabel: '27 ago 2026',
    title: 'Cuántas te quedan',
    tagline: 'En el grupo ves tus auras y lauras. Ya no puedes votarte a ti mismo.',
    items: [
      {
        icon: 'bar',
        title: 'Te quedan tantas',
        detail: 'Arriba del feed ves cuántas auras y lauras te faltan por dar.',
      },
      {
        icon: 'lock',
        title: 'Sin votarte a ti mismo',
        detail: 'Aura y laura son para los demás. En tu propio entreno no hay botones.',
      },
    ],
  },
  {
    id: '2026.08.27-profile',
    dateLabel: '27 ago 2026',
    title: 'Tu perfil desde Inicio',
    tagline: 'Un toque en tu foto y ves lo que publicaste.',
    items: [
      {
        icon: 'user',
        title: 'Toca tu foto',
        detail: 'En Inicio, tu cara abre tu perfil con tus entrenos.',
      },
    ],
  },
  {
    id: '2026.08.27-recap-cards',
    dateLabel: '27 ago 2026',
    title: 'El recap ya no señala',
    tagline: 'Se acabó el podio de la burla.',
    items: [
      {
        icon: 'trophy',
        title: 'Sin “quién la rompió” ni “el más flojo”',
        detail: 'El recap muestra cómo le fue al grupo y a cada uno. Nada de tarjetas para señalar.',
      },
    ],
  },
  {
    id: '2026.08.27-streaks',
    dateLabel: '27 ago 2026',
    title: 'La racha perdona el descanso',
    tagline: 'Se rompe si no cumples la meta, no si fallas un día.',
    items: [
      {
        icon: 'flame',
        title: 'Descansa si ya llegaste',
        detail: 'Si tu meta es 4 y entrenaste 4, el viernes libre no te apaga la llama.',
      },
    ],
  },
  {
    id: '2026.08.27-votes',
    dateLabel: '27 ago 2026',
    title: 'Votos que se ganan entrenando',
    tagline: 'Cuantos más entrenos, más auras y lauras.',
    items: [
      {
        icon: 'bar',
        title: 'Un aura y una laura por entreno',
        detail: 'Cada vez que marcas, ganas uno de cada para dar. No se gastan al día: se acumulan.',
      },
      {
        icon: 'lock',
        title: 'Al día siguiente, se queda',
        detail: 'El mismo día lo puedes sacar o cambiar. Si pasó un día, ese voto ya no se mueve.',
      },
    ],
  },
  {
    id: '2026.08.27-posts',
    dateLabel: '27 ago 2026',
    title: 'Posts en el grupo',
    tagline: 'Di algo sin marcar un entreno.',
    items: [
      {
        icon: 'pen',
        title: 'Escribe en el grupo',
        detail: 'Un post de texto, sin votos. No cuenta como entreno.',
      },
    ],
  },
  {
    id: '2026.08.27',
    dateLabel: '27 ago 2026',
    title: 'Fotos, votos y recap',
    tagline: 'Lo que pediste, sin rodeos.',
    items: [
      {
        icon: 'camera',
        title: 'Hasta 3 fotos por entreno',
        detail: 'Saca o elige hasta tres. En el feed se deslizan de costado.',
      },
      {
        icon: 'bell',
        title: 'Después de marcar, un aviso',
        detail: 'Te recuerda que ya puedes votar los entrenos de tus amigos.',
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

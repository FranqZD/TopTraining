/**
 * Mascotas en SVG animado. Cinco especies, cinco niveles, cuatro ánimos.
 * `day1` es el triste del mismo nivel: misma silueta y tamaño, color caído.
 * Al tocarla reacciona una vez (`interactive`, true por defecto).
 *
 *   <Pet species="bonsai" level={4} health="ok" size={120} />
 */
import { useState, type KeyboardEvent, type MouseEvent, type SVGProps } from 'react'
import './pets.css'

type Anim = {
  className: string
  style: { animationDuration: string; transformOrigin: string; animationDelay?: string }
}

const A = (
  name: string,
  duration: string,
  transformOrigin = '50px 90px',
  animationDelay?: string,
): Anim => ({
  className: 'p-' + name,
  style: animationDelay
    ? { animationDuration: duration, transformOrigin, animationDelay }
    : { animationDuration: duration, transformOrigin },
})

const scale = (k: number) => `translate(50 90) scale(${k}) translate(-50 -90)`

export const SPECIES = ['blob', 'gem', 'bird', 'plant', 'bonsai'] as const
export type PetSpecies = (typeof SPECIES)[number]

export const HEALTH = ['ok', 'day1', 'days3', 'dormant'] as const
export type PetHealth = (typeof HEALTH)[number]

export const SPECIES_NAMES: Record<PetSpecies, string> = {
  blob: 'Gota',
  gem: 'Gema',
  bird: 'Ave',
  plant: 'Planta',
  bonsai: 'Bonsái',
}

export const LEVEL_NAMES: Record<PetSpecies, [string, string, string, string, string]> = {
  blob: ['Gota', 'Sonriente', 'Brillante', 'Radiante', 'Coronada'],
  gem: ['Esquirla', 'Fragmento', 'Pulido', 'Resplandeciente', 'Gema mayor'],
  bird: ['Polluelo', 'Con copete', 'Erguido', 'Volando', 'Ave coronada'],
  plant: ['Brote', 'Tallo', 'Un brazo', 'Floreciendo', 'En plena flor'],
  bonsai: ['Semilla', 'Brote', 'Tallo', 'Ramas', 'Copa plena'],
}

export const HEALTH_NAMES: Record<PetHealth, string> = {
  ok: 'Sano',
  day1: 'Triste',
  days3: 'Caído',
  dormant: 'Fallecido',
}

/** Etiqueta legible del estado actual, para tooltips o aria-label. */
export function petLabel(species: PetSpecies, level: number, health: PetHealth): string {
  const base = LEVEL_NAMES[species]?.[Math.min(Math.max(level, 1), 5) - 1] ?? ''
  return health === 'ok' ? base : base + ' · ' + HEALTH_NAMES[health]
}

type PokePair = [string, number]
type PokeSet = { ok: PokePair[]; day1: PokePair; days3: PokePair; dormant: PokePair }

const POKE: Record<PetSpecies, PokeSet> = {
  bird: {
    ok: [['peck', 420], ['hopSmall', 470], ['hop', 540], ['flutter', 660], ['spin', 780]],
    day1: ['peep', 900],
    days3: ['ruffle', 620],
    dormant: ['stir', 1100],
  },
  blob: {
    ok: [['squish', 400], ['jiggle', 460], ['boing', 520], ['splat', 600], ['roll', 760]],
    day1: ['slump', 900],
    days3: ['ripple', 760],
    dormant: ['shellTap', 950],
  },
  gem: {
    ok: [['chime', 420], ['ring', 480], ['pivot', 540], ['vault', 660], ['prism', 820]],
    day1: ['dim', 950],
    days3: ['rattle', 640],
    dormant: ['hover', 1200],
  },
  plant: {
    ok: [['nod', 420], ['bend', 480], ['spring', 560], ['rustle', 640], ['bloom', 760]],
    day1: ['limp', 1000],
    days3: ['crumble', 820],
    dormant: ['wake', 1100],
  },
  bonsai: {
    ok: [['creak', 480], ['lean', 540], ['quiver', 600], ['gust', 700], ['flourish', 860]],
    day1: ['sigh', 1100],
    days3: ['snap', 780],
    dormant: ['breath', 1300],
  },
}
const POKE_DEFAULT: PokePair = ['nudge', 520]

/** Nombre y duración de la reacción de un estado concreto. */
export function pokeAnim(species: PetSpecies, level: number, health: PetHealth): PokePair {
  const set = POKE[species]
  if (!set) return POKE_DEFAULT
  const entry = health === 'ok' ? set.ok[Math.min(Math.max(level, 1), 5) - 1] : set[health]
  return entry ?? POKE_DEFAULT
}

export type PetPoke = {
  species: PetSpecies
  level: number
  health: PetHealth
  animation: string
}

function Burst({ health }: { health: PetHealth }) {
  if (health === 'ok') {
    return (
      <g className="p-burst-spark" style={{ transformOrigin: '50px 46px', transformBox: 'view-box' }} stroke="var(--pet-accent)" strokeWidth="2.5" fill="none">
        <path d="M16 32l-8-5M84 32l8-5M50 6V0M28 16l-4-8M72 16l4-8" />
      </g>
    )
  }
  if (health === 'day1') {
    return (
      <g className="p-burst-drop" style={{ transformOrigin: '70px 30px', transformBox: 'view-box' }}>
        <circle cx="70" cy="30" r="3" fill="var(--pet-mute)" />
      </g>
    )
  }
  if (health === 'days3') {
    return (
      <g className="p-burst-dust" style={{ transformOrigin: '50px 84px', transformBox: 'view-box' }} fill="var(--pet-mute-2)">
        <rect x="22" y="80" width="9" height="4" />
        <rect x="69" y="80" width="9" height="4" />
        <rect x="44" y="76" width="7" height="3" />
      </g>
    )
  }
  return (
    <g className="p-burst-z" style={{ transformOrigin: '74px 34px', transformBox: 'view-box' }} stroke="var(--pet-accent)" strokeWidth="2.5" fill="none">
      <path d="M70 26h9l-9 10h9" />
    </g>
  )
}

function Blob({ level, health }: { level: number; health: PetHealth }) {
  if (health === 'days3') return (<><g transform={scale(1)}><g {...A('ooze','5.5s','50px 90px')}><path d="M14 90C14 76 28 62 50 62C72 62 86 76 86 90Z" fill="var(--pet-mute)" /><path d="M36 74l8 8M44 74l-8 8M56 74l8 8M64 74l-8 8" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /></g></g></>);
  if (health === 'dormant') return (<><path d="M50 28L72 58V90H28V58Z" fill="var(--pet-mute-2)" /><path d="M50 28V90M28 58h44M35 74l30-16" fill="none" stroke="var(--pet-bg)" strokeWidth="2" /><path d="M38 66h8M54 66h8" fill="none" stroke="var(--pet-ink-soft)" strokeWidth="3" /><path d="M18 34l8 6M82 34l-8 6M20 52h8M72 52h8" fill="none" stroke="var(--pet-soil)" strokeWidth="2" {...A('frost','4.5s','50px 90px')} /></>);
  if (health === 'day1') {
    if (level <= 1) return (<><g transform={scale(0.5)}><g {...A('sag','5.4s','50px 90px')}><path d="M50 14C66 34 78 52 78 64A28 28 0 0 1 22 64C22 52 34 34 50 14Z" fill="var(--pet-accent-soft)" /><path d="M38 58h8M54 58h8" fill="none" stroke="var(--pet-ink)" strokeWidth="3" /><path d="M40 78Q50 70 60 78" fill="none" stroke="var(--pet-ink)" strokeWidth="3" /></g></g></>);
    if (level <= 2) return (<><g transform={scale(0.64)}><g {...A('sag','5s','50px 90px')}><path d="M50 14C66 34 78 52 78 64A28 28 0 0 1 22 64C22 52 34 34 50 14Z" fill="var(--pet-accent-soft)" /><path d="M38 58h8M54 58h8" fill="none" stroke="var(--pet-ink)" strokeWidth="3" /><path d="M40 78Q50 70 60 78" fill="none" stroke="var(--pet-ink)" strokeWidth="3" /></g></g></>);
    if (level <= 3) return (<><g transform={scale(0.78)}><g {...A('sag','4.6s','50px 90px')}><path d="M50 14C66 34 78 52 78 64A28 28 0 0 1 22 64C22 52 34 34 50 14Z" fill="var(--pet-accent-soft)" /><path d="M38 58h8M54 58h8" fill="none" stroke="var(--pet-ink)" strokeWidth="3" /><path d="M40 78Q50 70 60 78" fill="none" stroke="var(--pet-ink)" strokeWidth="3" /></g></g></>);
    if (level <= 4) return (<><g transform={scale(0.92)}><g {...A('sag','4.2s','50px 90px')}><path d="M50 14C66 34 78 52 78 64A28 28 0 0 1 22 64C22 52 34 34 50 14Z" fill="var(--pet-accent-soft)" /><path d="M38 58h8M54 58h8" fill="none" stroke="var(--pet-ink)" strokeWidth="3" /><path d="M40 78Q50 70 60 78" fill="none" stroke="var(--pet-ink)" strokeWidth="3" /></g></g></>);
    if (level <= 5) return (<><g transform={scale(0.84)}><g {...A('sag','4s','50px 90px')}><path d="M50 14C66 34 78 52 78 64A28 28 0 0 1 22 64C22 52 34 34 50 14Z" fill="var(--pet-accent-soft)" /><path d="M38 58h8M54 58h8" fill="none" stroke="var(--pet-ink)" strokeWidth="3" /><path d="M40 78Q50 70 60 78" fill="none" stroke="var(--pet-ink)" strokeWidth="3" /></g></g><path d="M36 22L36 8L43 14L50 4L57 14L64 8L64 22Z" fill="var(--pet-mute)" /></>);
    return null;
  }
  if (level <= 1) return (<><g transform={scale(0.5)}><g {...A('breathe','3.6s','50px 90px')}><path d="M50 14C66 34 78 52 78 64A28 28 0 0 1 22 64C22 52 34 34 50 14Z" fill="var(--pet-accent)" /><rect x="38" y="56" width="6" height="6" fill="var(--pet-bg)" /><rect x="56" y="56" width="6" height="6" fill="var(--pet-bg)" /><path d="M42 74h16" fill="none" stroke="var(--pet-bg)" strokeWidth="3" /></g></g></>);
  if (level <= 2) return (<><g transform={scale(0.64)}><g {...A('breathe','3s','50px 90px')}><path d="M50 14C66 34 78 52 78 64A28 28 0 0 1 22 64C22 52 34 34 50 14Z" fill="var(--pet-accent)" /><rect x="38" y="56" width="6" height="6" fill="var(--pet-bg)" /><rect x="56" y="56" width="6" height="6" fill="var(--pet-bg)" /><path d="M38 72Q50 82 62 72" fill="none" stroke="var(--pet-bg)" strokeWidth="3" /></g></g></>);
  if (level <= 3) return (<><g transform={scale(0.78)}><g {...A('bob','2.2s','50px 90px')}><path d="M50 14C66 34 78 52 78 64A28 28 0 0 1 22 64C22 52 34 34 50 14Z" fill="var(--pet-accent)" /><rect x="35" y="35" width="5" height="13" fill="var(--pet-bg)" transform="rotate(-18 37 41)" /><rect x="38" y="56" width="6" height="6" fill="var(--pet-bg)" /><rect x="56" y="56" width="6" height="6" fill="var(--pet-bg)" /><path d="M38 72Q50 82 62 72" fill="none" stroke="var(--pet-bg)" strokeWidth="3" /></g></g></>);
  if (level <= 4) return (<><g transform={scale(0.92)}><g {...A('bob','1.5s','50px 90px')}><path d="M50 14C66 34 78 52 78 64A28 28 0 0 1 22 64C22 52 34 34 50 14Z" fill="var(--pet-accent)" /><rect x="35" y="35" width="5" height="13" fill="var(--pet-bg)" transform="rotate(-18 37 41)" /><rect x="38" y="56" width="6" height="6" fill="var(--pet-bg)" /><rect x="56" y="56" width="6" height="6" fill="var(--pet-bg)" /><path d="M38 72Q50 82 62 72" fill="none" stroke="var(--pet-bg)" strokeWidth="3" /></g></g><g stroke="var(--pet-ink)" strokeWidth="2" fill="none" {...A('twinkle','1.8s','50px 90px')}><path d="M12 40h8M80 40h8M22 22l6 6M78 22l-6 6M50 6v8" /></g></>);
  if (level <= 5) return (<><circle cx="50" cy="54" r="42" fill="none" stroke="var(--pet-accent-soft)" strokeWidth="2" {...A('pulseRing','2.6s','50px 54px')} /><g transform={scale(0.84)}><g {...A('bob','1s','50px 90px')}><path d="M50 14C66 34 78 52 78 64A28 28 0 0 1 22 64C22 52 34 34 50 14Z" fill="var(--pet-accent)" /><rect x="35" y="35" width="5" height="13" fill="var(--pet-bg)" transform="rotate(-18 37 41)" /><rect x="38" y="56" width="6" height="6" fill="var(--pet-bg)" /><rect x="56" y="56" width="6" height="6" fill="var(--pet-bg)" /><path d="M38 72Q50 82 62 72" fill="none" stroke="var(--pet-bg)" strokeWidth="3" /></g></g><path d="M36 22L36 8L43 14L50 4L57 14L64 8L64 22Z" fill="var(--pet-accent)" /><g stroke="var(--pet-ink)" strokeWidth="2" fill="none" {...A('twinkle','1.3s','50px 90px')}><path d="M6 46h8M86 46h8M14 22l6 6M86 22l-6 6M50 26v-6M10 70l7-4M90 70l-7-4M30 16l3 7M70 16l-3 7" /></g></>);
  return null;
}

function Gem({ level, health }: { level: number; health: PetHealth }) {
  if (health === 'days3') return (<><g transform={scale(0.88)}><g {...A('tremor','4s','50px 90px')}><path d="M50 10L78 32L66 84H34L22 32Z" fill="var(--pet-mute)" /><path d="M50 10L42 40L60 50L48 84M28 40h14M64 62l-6 14" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /></g></g></>);
  if (health === 'dormant') return (<><g transform={scale(0.88)}><g {...A('drift','6s','50px 90px')}><path d="M50 10L78 32L70 58L52 44L48 84H34L22 32Z" fill="var(--pet-mute-2)" /><path d="M50 10L48 84M22 32h28" fill="none" stroke="var(--pet-ink-soft)" strokeWidth="2.5" /></g></g><g {...A('sprout','3.6s','76px 78px')}><rect x="72" y="74" width="7" height="7" fill="var(--pet-accent)" /></g></>);
  if (health === 'day1') {
    if (level <= 1) return (<><g transform={scale(0.44)}><g {...A('breathe','6.5s','50px 90px')}><path d="M50 10L78 32L66 84H34L22 32Z" fill="var(--pet-accent-soft)" /><path d="M50 10V84" fill="none" stroke="var(--pet-bg)" strokeWidth="2" /></g></g></>);
    if (level <= 2) return (<><g transform={scale(0.58)}><g {...A('breathe','6.2s','50px 90px')}><path d="M50 10L78 32L66 84H34L22 32Z" fill="var(--pet-accent-soft)" /><path d="M50 10V84" fill="none" stroke="var(--pet-bg)" strokeWidth="2" /></g></g></>);
    if (level <= 3) return (<><g transform={scale(0.72)}><g {...A('breathe','6s','50px 90px')}><path d="M50 10L78 32L66 84H34L22 32Z" fill="var(--pet-accent-soft)" /><path d="M50 10V84M22 32h56" fill="none" stroke="var(--pet-bg)" strokeWidth="2" /></g></g></>);
    if (level <= 4) return (<><g transform={scale(0.88)}><g {...A('breathe','5.6s','50px 90px')}><path d="M50 10L78 32L66 84H34L22 32Z" fill="var(--pet-accent-soft)" /><path d="M50 10V84M22 32h56M34 84L50 32L66 84" fill="none" stroke="var(--pet-bg)" strokeWidth="2" /></g></g></>);
    if (level <= 5) return (<><g transform={scale(0.78)}><g {...A('breathe','5.2s','50px 90px')}><path d="M50 10L78 32L66 84H34L22 32Z" fill="var(--pet-accent-soft)" /><path d="M50 10V84M22 32h56M34 84L50 32L66 84" fill="none" stroke="var(--pet-bg)" strokeWidth="2" /></g></g><g {...A('orbit','26s','50px 50px')}><path d="M50 4l5 7-5 7-5-7Z" fill="var(--pet-mute)" /><path d="M88 62l5 7-5 7-5-7Z" fill="var(--pet-mute)" /><path d="M12 62l5 7-5 7-5-7Z" fill="var(--pet-mute)" /></g></>);
    return null;
  }
  if (level <= 1) return (<><g transform={scale(0.44)}><g {...A('breathe','5s','50px 90px')}><path d="M50 10L78 32L66 84H34L22 32Z" fill="var(--pet-accent)" /><path d="M50 10V84" fill="none" stroke="var(--pet-bg)" strokeWidth="2" /></g></g></>);
  if (level <= 2) return (<><g transform={scale(0.58)}><g {...A('breathe','4s','50px 90px')}><path d="M50 10L78 32L66 84H34L22 32Z" fill="var(--pet-accent)" /><path d="M50 10V84M22 32h56" fill="none" stroke="var(--pet-bg)" strokeWidth="2" /></g></g></>);
  if (level <= 3) return (<><g transform={scale(0.72)}><g {...A('breathe','3.2s','50px 90px')}><path d="M50 10L78 32L66 84H34L22 32Z" fill="var(--pet-accent)" /><path d="M50 10V84M22 32h56M34 84L50 32L66 84" fill="none" stroke="var(--pet-bg)" strokeWidth="2" /><path d="M40 26l-6 30" fill="none" stroke="var(--pet-bg)" strokeWidth="5" {...A('glint','3.4s','50px 90px')} /></g></g></>);
  if (level <= 4) return (<><g transform={scale(0.88)}><g {...A('breathe','2.6s','50px 90px')}><path d="M50 10L78 32L66 84H34L22 32Z" fill="var(--pet-accent)" /><path d="M50 10V84M22 32h56M34 84L50 32L66 84M22 32L34 84M78 32L66 84" fill="none" stroke="var(--pet-bg)" strokeWidth="2" /><path d="M40 26l-6 30" fill="none" stroke="var(--pet-bg)" strokeWidth="5" {...A('glint','2.2s','50px 90px')} /></g></g><g stroke="var(--pet-ink)" strokeWidth="2" fill="none" {...A('twinkle','1.8s','50px 90px')}><path d="M12 40h8M80 40h8M22 22l6 6M78 22l-6 6M50 6v8" /></g></>);
  if (level <= 5) return (<><path d="M50 0L94 30L78 94H22L6 30Z" fill="none" stroke="var(--pet-accent-soft)" strokeWidth="2" {...A('pulseRing','3s','50px 50px')} /><g transform={scale(0.78)}><g {...A('breathe','2s','50px 90px')}><path d="M50 10L78 32L66 84H34L22 32Z" fill="var(--pet-accent)" /><path d="M50 10V84M22 32h56M34 84L50 32L66 84M22 32L34 84M78 32L66 84" fill="none" stroke="var(--pet-bg)" strokeWidth="2" /><path d="M40 26l-6 30" fill="none" stroke="var(--pet-bg)" strokeWidth="5" {...A('glint','1.5s','50px 90px')} /></g></g><g {...A('orbit','11s','50px 50px')}><path d="M50 4l5 7-5 7-5-7Z" fill="var(--pet-accent)" /><path d="M88 62l5 7-5 7-5-7Z" fill="var(--pet-accent)" /><path d="M12 62l5 7-5 7-5-7Z" fill="var(--pet-accent)" /></g><g stroke="var(--pet-ink)" strokeWidth="2" fill="none" {...A('twinkle','1.3s','50px 90px')}><path d="M6 46h8M86 46h8M14 22l6 6M86 22l-6 6M50 26v-6M10 70l7-4M90 70l-7-4M30 16l3 7M70 16l-3 7" /></g></>);
  return null;
}

function Bird({ level, health }: { level: number; health: PetHealth }) {
  if (health === 'days3') return (<><g {...A('shiver','1.4s','50px 90px')}><path d="M33 84C29 70 32 56 44 53C52 51 60 54 65 60C61 62 66 66 68 70C64 71 69 76 68 84Z" fill="var(--pet-mute)" /><circle cx="42" cy="47" r="11" fill="var(--pet-mute)" /><path d="M35 46h6M45 46h5" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /><path d="M32 52L21 56L32 60Z" fill="var(--pet-ink)" /><path d="M44 66h10M42 74h8" fill="none" stroke="var(--pet-ink-soft)" strokeWidth="2" /></g><g stroke="var(--pet-ink-soft)" strokeWidth="2" fill="none"><path d="M76 40l6-4" fill="none" stroke="var(--pet-ink-soft)" strokeWidth="2" {...A('fall','3.6s','50px 90px')} /><path d="M80 52l7-2" fill="none" stroke="var(--pet-ink-soft)" strokeWidth="2" {...A('fall','3.6s','50px 90px','1.2s')} /><path d="M72 30l3-7" fill="none" stroke="var(--pet-ink-soft)" strokeWidth="2" {...A('fall','3.6s','50px 90px','2.4s')} /></g><path d="M45 84v4M39 88h12M59 84v4M53 88h12" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /></>);
  if (health === 'dormant') return (<><g {...A('breathe','4.5s','50px 90px')}><path d="M26 90C26 66 36 56 50 56C64 56 74 66 74 90Z" fill="var(--pet-mute-2)" /><path d="M49 56C49 50 53 46 58 46C54 49 54 52 55 56Z" fill="var(--pet-mute-2)" /><path d="M28 80C40 62 60 62 71 76" fill="none" stroke="var(--pet-ink-soft)" strokeWidth="2" /><path d="M38 70h11" fill="none" stroke="var(--pet-ink-soft)" strokeWidth="2.5" /></g><path d="M70 40h8" fill="none" stroke="var(--pet-soil)" strokeWidth="2" {...A('twinkle','3s','50px 90px')} /><path d="M74 32h8" fill="none" stroke="var(--pet-soil)" strokeWidth="2" {...A('twinkle','3s','50px 90px','.5s')} /><path d="M78 24h6" fill="none" stroke="var(--pet-soil)" strokeWidth="2" {...A('twinkle','3s','50px 90px','1s')} /></>);
  if (health === 'day1') {
    if (level <= 1) return (<><g transform={scale(0.5)}><g {...A('sag','5.4s','50px 90px')}><ellipse cx="48" cy="60" rx="21" ry="20" fill="var(--pet-accent-soft)" /><g transform="translate(-7 7)" {...A('droop','5.4s','50px 64px')}><circle cx="52" cy="34" r="14" fill="var(--pet-accent-soft)" /><path d="M46 33h6M57 33h6" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /><path d="M66 38L80 42L66 46Z" fill="var(--pet-ink)" /></g><path d="M43 80v6M37 88h12M57 80v6M51 88h12" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /></g></g></>);
    if (level <= 2) return (<><g transform={scale(0.66)}><g {...A('sag','5.2s','50px 90px')}><ellipse cx="48" cy="60" rx="21" ry="20" fill="var(--pet-accent-soft)" /><g transform="translate(-7 7)" {...A('droop','5.4s','50px 64px')}><circle cx="52" cy="34" r="14" fill="var(--pet-accent-soft)" /><path d="M51 22C51 14 57 8 64 8C59 12 58 17 59 22Z" fill="var(--pet-accent-soft)" /><path d="M46 33h6M57 33h6" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /><path d="M66 38L80 42L66 46Z" fill="var(--pet-ink)" /></g><path d="M33 56C41 55 46 61 45 69C37 72 31 65 33 56Z" fill="var(--pet-ink-soft)" /><path d="M43 80v6M37 88h12M57 80v6M51 88h12" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /></g></g></>);
    if (level <= 3) return (<><g transform={scale(0.8)}><g {...A('sag','5s','50px 90px')}><path d="M28 50L14 44L20 60Z" fill="var(--pet-accent-soft)" /><ellipse cx="48" cy="60" rx="21" ry="20" fill="var(--pet-accent-soft)" /><g transform="translate(-7 7)" {...A('droop','5.4s','50px 64px')}><circle cx="52" cy="34" r="14" fill="var(--pet-accent-soft)" /><path d="M51 22C51 14 57 8 64 8C59 12 58 17 59 22Z" fill="var(--pet-accent-soft)" /><path d="M46 33h6M57 33h6" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /><path d="M66 38L80 42L66 46Z" fill="var(--pet-ink)" /></g><path d="M33 56C41 55 46 61 45 69C37 72 31 65 33 56Z" fill="var(--pet-ink-soft)" /><path d="M43 80v6M37 88h12M57 80v6M51 88h12" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /></g></g></>);
    if (level <= 4) return (<><g transform={scale(0.9)}><g {...A('sag','4.8s','50px 90px')}><path d="M28 50L14 44L20 60Z" fill="var(--pet-accent-soft)" /><ellipse cx="48" cy="60" rx="21" ry="20" fill="var(--pet-accent-soft)" /><g transform="translate(-7 7)" {...A('droop','5.4s','50px 64px')}><circle cx="52" cy="34" r="14" fill="var(--pet-accent-soft)" /><path d="M51 22C51 14 57 8 64 8C59 12 58 17 59 22Z" fill="var(--pet-accent-soft)" /><path d="M46 33h6M57 33h6" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /><path d="M66 38L80 42L66 46Z" fill="var(--pet-ink)" /></g><path d="M33 56C41 55 46 61 45 69C37 72 31 65 33 56Z" fill="var(--pet-ink-soft)" /><path d="M43 80v6M37 88h12M57 80v6M51 88h12" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /></g></g></>);
    if (level <= 5) return (<><g transform={scale(0.84)}><g {...A('sag','4.6s','50px 90px')}><path d="M28 50L14 44L20 60Z" fill="var(--pet-accent-soft)" /><ellipse cx="48" cy="60" rx="21" ry="20" fill="var(--pet-accent-soft)" /><g transform="translate(-7 7)" {...A('droop','5.4s','50px 64px')}><circle cx="52" cy="34" r="14" fill="var(--pet-accent-soft)" /><path d="M51 22C51 14 57 8 64 8C59 12 58 17 59 22Z" fill="var(--pet-accent-soft)" /><path d="M46 33h6M57 33h6" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /><path d="M66 38L80 42L66 46Z" fill="var(--pet-ink)" /></g><path d="M33 56C41 55 46 61 45 69C37 72 31 65 33 56Z" fill="var(--pet-ink-soft)" /><path d="M43 80v6M37 88h12M57 80v6M51 88h12" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /></g></g><path d="M36 22L36 8L43 14L50 4L57 14L64 8L64 22Z" fill="var(--pet-mute)" /></>);
    return null;
  }
  if (level <= 1) return (<><g transform={scale(0.5)}><g {...A('breathe','3.4s','50px 90px')}><ellipse cx="48" cy="60" rx="21" ry="20" fill="var(--pet-accent)" /><circle cx="52" cy="34" r="14" fill="var(--pet-accent)" /><path d="M66 36L80 40L66 44Z" fill="var(--pet-ink)" /><rect x="46" y="30" width="5" height="5" fill="var(--pet-bg)" /><rect x="57" y="30" width="5" height="5" fill="var(--pet-bg)" /><path d="M43 80v6M37 88h12M57 80v6M51 88h12" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /></g></g></>);
  if (level <= 2) return (<><g transform={scale(0.66)}><g {...A('breathe','3s','50px 90px')}><ellipse cx="48" cy="60" rx="21" ry="20" fill="var(--pet-accent)" /><circle cx="52" cy="34" r="14" fill="var(--pet-accent)" /><path d="M51 22C51 14 57 8 64 8C59 12 58 17 59 22Z" fill="var(--pet-accent)" /><path d="M66 36L80 40L66 44Z" fill="var(--pet-ink)" /><rect x="46" y="30" width="5" height="5" fill="var(--pet-bg)" /><rect x="57" y="30" width="5" height="5" fill="var(--pet-bg)" /><path d="M34 53C43 51 49 58 48 67C39 71 32 63 34 53Z" fill="var(--pet-ink)" /><path d="M43 80v6M37 88h12M57 80v6M51 88h12" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /></g></g></>);
  if (level <= 3) return (<><g transform={scale(0.8)}><g {...A('breathe','2.6s','50px 90px')}><path d="M28 50L14 44L20 60Z" fill="var(--pet-accent)" /><ellipse cx="48" cy="60" rx="21" ry="20" fill="var(--pet-accent)" /><circle cx="52" cy="34" r="14" fill="var(--pet-accent)" /><path d="M51 22C51 14 57 8 64 8C59 12 58 17 59 22Z" fill="var(--pet-accent)" /><path d="M66 36L80 40L66 44Z" fill="var(--pet-ink)" /><g {...A('blink','4.5s','52px 32px')}><rect x="46" y="30" width="5" height="5" fill="var(--pet-bg)" /><rect x="57" y="30" width="5" height="5" fill="var(--pet-bg)" /></g><path d="M34 53C43 51 49 58 48 67C39 71 32 63 34 53Z" fill="var(--pet-ink)" /><path d="M43 80v6M37 88h12M57 80v6M51 88h12" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /></g></g></>);
  if (level <= 4) return (<><g transform={scale(0.9)}><g {...A('bob','1.2s','50px 90px')}><path d="M20 30C30 34 36 44 38 54C30 54 22 46 20 30Z" fill="var(--pet-ink)" {...A('flapL','.6s','38px 54px')} /><path d="M80 30C70 34 64 44 62 54C70 54 78 46 80 30Z" fill="var(--pet-ink)" {...A('flapR','.6s','62px 54px')} /><ellipse cx="50" cy="58" rx="21" ry="19" fill="var(--pet-accent)" /><path d="M30 46L18 40L24 56Z" fill="var(--pet-accent)" /><circle cx="52" cy="32" r="14" fill="var(--pet-accent)" /><path d="M50 20C50 12 56 6 63 6C58 10 57 15 58 20Z" fill="var(--pet-accent)" /><rect x="46" y="28" width="5" height="5" fill="var(--pet-bg)" /><rect x="57" y="28" width="5" height="5" fill="var(--pet-bg)" /><path d="M66 34L80 40L66 42Z" fill="var(--pet-ink)" /><path d="M66 44L78 46L66 48Z" fill="var(--pet-ink)" /><path d="M43 76l-3 8M57 76l3 8" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /></g></g></>);
  if (level <= 5) return (<><circle cx="50" cy="50" r="44" fill="none" stroke="var(--pet-accent-soft)" strokeWidth="2" {...A('pulseRing','2.4s','50px 50px')} /><g transform={scale(0.8)}><g {...A('bob','.9s','50px 90px')}><path d="M20 30C30 34 36 44 38 54C30 54 22 46 20 30Z" fill="var(--pet-ink)" {...A('flapL','.4s','38px 54px')} /><path d="M80 30C70 34 64 44 62 54C70 54 78 46 80 30Z" fill="var(--pet-ink)" {...A('flapR','.4s','62px 54px')} /><ellipse cx="50" cy="58" rx="21" ry="19" fill="var(--pet-accent)" /><path d="M30 46L18 40L24 56Z" fill="var(--pet-accent)" /><circle cx="52" cy="32" r="14" fill="var(--pet-accent)" /><path d="M50 20C50 12 56 6 63 6C58 10 57 15 58 20Z" fill="var(--pet-accent)" /><rect x="46" y="28" width="5" height="5" fill="var(--pet-bg)" /><rect x="57" y="28" width="5" height="5" fill="var(--pet-bg)" /><path d="M66 34L80 40L66 42Z" fill="var(--pet-ink)" /><path d="M66 44L78 46L66 48Z" fill="var(--pet-ink)" /><path d="M43 76l-3 8M57 76l3 8" fill="none" stroke="var(--pet-ink)" strokeWidth="2.5" /></g></g><path d="M36 22L36 8L43 14L50 4L57 14L64 8L64 22Z" fill="var(--pet-accent)" /><g stroke="var(--pet-ink)" strokeWidth="2" fill="none" {...A('twinkle','1s','50px 90px')}><path d="M6 52h10M4 64h8M88 52h10M92 64h8" /></g></>);
  return null;
}

function Plant({ level, health }: { level: number; health: PetHealth }) {
  if (health === 'days3') return (<><g {...A('sag','7s','50px 90px')}><path d="M44 38C44 34 56 34 56 38V76H44Z" fill="var(--pet-mute)" /><path d="M44 46L32 62l-2 8 16-16Z" fill="var(--pet-mute)" /><path d="M56 52l12 16 2 8-14-16Z" fill="var(--pet-mute)" /></g><path d="M32 76h36l-4 14H36Z" fill="var(--pet-soil)" /></>);
  if (health === 'dormant') return (<><path d="M46 76V50C46 42 58 40 62 34" fill="none" stroke="var(--pet-mute)" strokeWidth="10" strokeLinecap="square" /><g {...A('sprout','3.2s','56px 72px')}><rect x="52" y="66" width="8" height="6" fill="var(--pet-accent)" /><rect x="58" y="60" width="5" height="8" fill="var(--pet-accent)" /></g><path d="M32 76h36l-4 14H36Z" fill="var(--pet-soil)" /></>);
  if (health === 'day1') {
    if (level <= 1) return (<><g {...A('droop','6.8s','50px 76px')}><rect x="47" y="62" width="6" height="14" fill="var(--pet-ink-soft)" /><rect x="36" y="66" width="11" height="6" fill="var(--pet-accent-soft)" /><rect x="53" y="64" width="11" height="6" fill="var(--pet-accent-soft)" /></g><path d="M32 76h36l-4 14H36Z" fill="var(--pet-soil)" /></>);
    if (level <= 2) return (<><g {...A('droop','6.6s','50px 76px')}><rect x="44" y="48" width="12" height="28" fill="var(--pet-ink-soft)" /><rect x="46" y="45" width="8" height="7" fill="var(--pet-accent-soft)" /><rect x="48" y="41" width="4" height="4" fill="var(--pet-accent-soft)" /></g><path d="M32 76h36l-4 14H36Z" fill="var(--pet-soil)" /></>);
    if (level <= 3) return (<><g {...A('droop','6.4s','50px 76px')}><rect x="44" y="38" width="12" height="38" fill="var(--pet-ink-soft)" /><rect x="56" y="54" width="14" height="6" fill="var(--pet-ink-soft)" /><rect x="64" y="60" width="6" height="14" fill="var(--pet-ink-soft)" /></g><path d="M32 76h36l-4 14H36Z" fill="var(--pet-soil)" /></>);
    if (level <= 4) return (<><g {...A('droop','6.2s','50px 76px')}><rect x="44" y="30" width="12" height="46" fill="var(--pet-ink-soft)" /><rect x="30" y="44" width="14" height="6" fill="var(--pet-ink-soft)" /><rect x="30" y="50" width="6" height="12" fill="var(--pet-ink-soft)" /><rect x="56" y="52" width="14" height="6" fill="var(--pet-ink-soft)" /><rect x="64" y="58" width="6" height="12" fill="var(--pet-ink-soft)" /><rect x="46" y="26" width="8" height="7" fill="var(--pet-accent-soft)" /><rect x="48" y="22" width="4" height="4" fill="var(--pet-accent-soft)" /></g><path d="M32 76h36l-4 14H36Z" fill="var(--pet-soil)" /></>);
    if (level <= 5) return (<><g {...A('droop','6s','50px 76px')}><rect x="44" y="26" width="12" height="50" fill="var(--pet-ink-soft)" /><rect x="28" y="42" width="16" height="6" fill="var(--pet-ink-soft)" /><rect x="28" y="48" width="6" height="14" fill="var(--pet-ink-soft)" /><rect x="56" y="50" width="16" height="6" fill="var(--pet-ink-soft)" /><rect x="66" y="54" width="6" height="14" fill="var(--pet-ink-soft)" /><rect x="46" y="22" width="8" height="7" fill="var(--pet-accent-soft)" /><rect x="48" y="18" width="4" height="4" fill="var(--pet-accent-soft)" /><rect x="27" y="60" width="8" height="7" fill="var(--pet-accent-soft)" /><rect x="29" y="56" width="4" height="4" fill="var(--pet-accent-soft)" /><rect x="65" y="66" width="8" height="7" fill="var(--pet-accent-soft)" /><rect x="67" y="62" width="4" height="4" fill="var(--pet-accent-soft)" /></g><path d="M32 76h36l-4 14H36Z" fill="var(--pet-soil)" /></>);
    return null;
  }
  if (level <= 1) return (<><g {...A('sway','4.8s','50px 76px')}><rect x="47" y="62" width="6" height="14" fill="var(--pet-ink)" /><rect x="36" y="58" width="11" height="6" fill="var(--pet-accent)" /><rect x="53" y="54" width="11" height="6" fill="var(--pet-accent)" /></g><path d="M32 76h36l-4 14H36Z" fill="var(--pet-soil)" /></>);
  if (level <= 2) return (<><g {...A('sway','5s','50px 76px')}><rect x="44" y="48" width="12" height="28" fill="var(--pet-ink)" /><rect x="46" y="42" width="8" height="7" fill="var(--pet-accent)" /></g><path d="M32 76h36l-4 14H36Z" fill="var(--pet-soil)" /></>);
  if (level <= 3) return (<><g {...A('swaySoft','5.4s','50px 76px')}><rect x="44" y="38" width="12" height="38" fill="var(--pet-ink)" /><rect x="56" y="54" width="14" height="6" fill="var(--pet-ink)" /><rect x="64" y="42" width="6" height="14" fill="var(--pet-ink)" /></g><path d="M32 76h36l-4 14H36Z" fill="var(--pet-soil)" /></>);
  if (level <= 4) return (<><g {...A('swaySoft','4.6s','50px 76px')}><rect x="44" y="30" width="12" height="46" fill="var(--pet-ink)" /><rect x="30" y="44" width="14" height="6" fill="var(--pet-ink)" /><rect x="30" y="32" width="6" height="14" fill="var(--pet-ink)" /><rect x="56" y="52" width="14" height="6" fill="var(--pet-ink)" /><rect x="64" y="40" width="6" height="14" fill="var(--pet-ink)" /><g {...A('bob','2.2s','50px 90px')}><circle cx="50" cy="22" r="6" fill="var(--pet-accent)" /><rect x="47" y="8" width="6" height="7" fill="var(--pet-accent)" /><rect x="35" y="19" width="8" height="6" fill="var(--pet-accent)" /><rect x="57" y="19" width="8" height="6" fill="var(--pet-accent)" /></g></g><path d="M32 76h36l-4 14H36Z" fill="var(--pet-soil)" /></>);
  if (level <= 5) return (<><circle cx="50" cy="46" r="44" fill="none" stroke="var(--pet-accent-soft)" strokeWidth="2" {...A('pulseRing','2.8s','50px 46px')} /><g {...A('swaySoft','4s','50px 76px')}><rect x="44" y="26" width="12" height="50" fill="var(--pet-ink)" /><rect x="28" y="42" width="16" height="6" fill="var(--pet-ink)" /><rect x="28" y="28" width="6" height="16" fill="var(--pet-ink)" /><rect x="56" y="50" width="16" height="6" fill="var(--pet-ink)" /><rect x="66" y="34" width="6" height="18" fill="var(--pet-ink)" /><g {...A('bob','1.8s','50px 90px')}><circle cx="50" cy="18" r="6" fill="var(--pet-accent)" /><rect x="47" y="4" width="6" height="7" fill="var(--pet-accent)" /><rect x="35" y="15" width="8" height="6" fill="var(--pet-accent)" /><rect x="57" y="15" width="8" height="6" fill="var(--pet-accent)" /></g><g {...A('bob','2.4s','50px 90px')}><circle cx="31" cy="22" r="6" fill="var(--pet-accent)" /><rect x="28" y="8" width="6" height="7" fill="var(--pet-accent)" /><rect x="16" y="19" width="8" height="6" fill="var(--pet-accent)" /><rect x="38" y="19" width="8" height="6" fill="var(--pet-accent)" /></g><g {...A('bob','2.1s','50px 90px')}><circle cx="69" cy="28" r="6" fill="var(--pet-accent)" /><rect x="66" y="14" width="6" height="7" fill="var(--pet-accent)" /><rect x="54" y="25" width="8" height="6" fill="var(--pet-accent)" /><rect x="76" y="25" width="8" height="6" fill="var(--pet-accent)" /></g></g><path d="M32 76h36l-4 14H36Z" fill="var(--pet-soil)" /></>);
  return null;
}

function Bonsai({ level, health }: { level: number; health: PetHealth }) {
  if (health === 'days3') return (<><rect x="45" y="24" width="10" height="52" fill="var(--pet-ink)" /><rect x="20" y="38" width="26" height="6" fill="var(--pet-ink)" /><rect x="54" y="46" width="26" height="6" fill="var(--pet-ink)" /><g {...A('sag','8s','50px 90px')}><rect x="14" y="24" width="26" height="14" fill="var(--pet-mute)" /><rect x="58" y="32" width="24" height="14" fill="var(--pet-mute)" /><rect x="34" y="10" width="28" height="12" fill="var(--pet-mute)" /></g><rect x="22" y="58" width="8" height="4" fill="var(--pet-mute)" {...A('fall','3.4s','50px 90px')} /><rect x="68" y="64" width="8" height="4" fill="var(--pet-mute)" {...A('fall','3.4s','50px 90px','1.1s')} /><rect x="36" y="68" width="8" height="4" fill="var(--pet-mute)" {...A('fall','3.4s','50px 90px','2.2s')} /><path d="M26 76h48l-6 14H32Z" fill="var(--pet-soil)" /></>);
  if (health === 'dormant') return (<><rect x="45" y="24" width="10" height="52" fill="var(--pet-ink)" /><rect x="20" y="38" width="26" height="6" fill="var(--pet-ink)" /><rect x="54" y="46" width="26" height="6" fill="var(--pet-ink)" /><g {...A('sag','9s','50px 90px')}><rect x="14" y="24" width="26" height="14" fill="var(--pet-mute-2)" /><rect x="58" y="32" width="24" height="14" fill="var(--pet-mute-2)" /><rect x="34" y="10" width="28" height="12" fill="var(--pet-mute-2)" /></g><g {...A('sprout','3.6s','50px 70px')}><rect x="46" y="64" width="8" height="6" fill="var(--pet-accent)" /></g><path d="M26 76h48l-6 14H32Z" fill="var(--pet-soil)" /></>);
  if (health === 'day1') {
    if (level <= 1) return (<><ellipse cx="50" cy="70" rx="6" ry="5" fill="var(--pet-ink-soft)" {...A('sprout','6s','50px 72px')} /><path d="M26 76h48l-6 14H32Z" fill="var(--pet-soil)" /></>);
    if (level <= 2) return (<><rect x="47" y="56" width="6" height="20" fill="var(--pet-ink-soft)" /><g {...A('droop','6.6s','50px 76px')}><path d="M35 52h12v6l-12 4Z" fill="var(--pet-accent-soft)" /><path d="M65 46h-12v6l12 4Z" fill="var(--pet-accent-soft)" /></g><path d="M26 76h48l-6 14H32Z" fill="var(--pet-soil)" /></>);
    if (level <= 3) return (<><rect x="46" y="38" width="8" height="38" fill="var(--pet-ink-soft)" /><g {...A('droop','6.4s','50px 76px')}><rect x="30" y="42" width="16" height="7" fill="var(--pet-accent-soft)" /><rect x="54" y="52" width="16" height="7" fill="var(--pet-accent-soft)" /><rect x="38" y="30" width="24" height="8" fill="var(--pet-accent-soft)" /></g><rect x="64" y="62" width="8" height="4" fill="var(--pet-mute)" {...A('fall','5s','50px 90px')} /><path d="M26 76h48l-6 14H32Z" fill="var(--pet-soil)" /></>);
    if (level <= 4) return (<><rect x="46" y="30" width="8" height="46" fill="var(--pet-ink)" /><rect x="26" y="42" width="20" height="6" fill="var(--pet-ink)" /><rect x="54" y="52" width="18" height="6" fill="var(--pet-ink)" /><g {...A('droop','6.2s','50px 76px')}><rect x="18" y="30" width="24" height="12" fill="var(--pet-accent-soft)" /><rect x="58" y="40" width="22" height="12" fill="var(--pet-accent-soft)" /><rect x="38" y="16" width="24" height="12" fill="var(--pet-accent-soft)" /></g><rect x="66" y="60" width="8" height="4" fill="var(--pet-mute)" {...A('fall','5s','50px 90px')} /><path d="M26 76h48l-6 14H32Z" fill="var(--pet-soil)" /></>);
    if (level <= 5) return (<><rect x="45" y="24" width="10" height="52" fill="var(--pet-ink)" /><rect x="20" y="38" width="26" height="6" fill="var(--pet-ink)" /><rect x="54" y="46" width="26" height="6" fill="var(--pet-ink)" /><g {...A('droop','6s','50px 76px')}><rect x="10" y="22" width="32" height="16" fill="var(--pet-accent-soft)" /><rect x="58" y="30" width="32" height="16" fill="var(--pet-accent-soft)" /><rect x="30" y="6" width="38" height="16" fill="var(--pet-accent-soft)" /></g><rect x="66" y="60" width="8" height="4" fill="var(--pet-mute)" {...A('fall','5s','50px 90px')} /><rect x="24" y="62" width="8" height="4" fill="var(--pet-mute)" {...A('fall','5s','50px 90px','2s')} /><path d="M26 76h48l-6 14H32Z" fill="var(--pet-soil)" /></>);
    return null;
  }
  if (level <= 1) return (<><ellipse cx="50" cy="70" rx="6" ry="5" fill="var(--pet-ink)" {...A('sprout','3.6s','50px 72px')} /><path d="M26 76h48l-6 14H32Z" fill="var(--pet-soil)" /></>);
  if (level <= 2) return (<><rect x="47" y="56" width="6" height="20" fill="var(--pet-ink)" /><g {...A('sway','4.8s','50px 76px')}><rect x="35" y="52" width="12" height="6" fill="var(--pet-accent)" /><rect x="53" y="46" width="12" height="6" fill="var(--pet-accent)" /></g><path d="M26 76h48l-6 14H32Z" fill="var(--pet-soil)" /></>);
  if (level <= 3) return (<><rect x="46" y="38" width="8" height="38" fill="var(--pet-ink)" /><g {...A('swaySoft','5.2s','50px 76px')}><rect x="30" y="42" width="16" height="7" fill="var(--pet-accent)" /><rect x="54" y="52" width="16" height="7" fill="var(--pet-accent)" /><rect x="38" y="30" width="24" height="8" fill="var(--pet-accent)" /></g><path d="M26 76h48l-6 14H32Z" fill="var(--pet-soil)" /></>);
  if (level <= 4) return (<><rect x="46" y="30" width="8" height="46" fill="var(--pet-ink)" /><rect x="26" y="42" width="20" height="6" fill="var(--pet-ink)" /><rect x="54" y="52" width="18" height="6" fill="var(--pet-ink)" /><g {...A('swaySoft','5.6s','50px 76px')}><rect x="18" y="30" width="26" height="12" fill="var(--pet-accent)" /><rect x="56" y="40" width="24" height="12" fill="var(--pet-accent)" /><rect x="38" y="16" width="26" height="12" fill="var(--pet-accent)" /></g><path d="M26 76h48l-6 14H32Z" fill="var(--pet-soil)" /></>);
  if (level <= 5) return (<><circle cx="50" cy="44" r="46" fill="none" stroke="var(--pet-accent-soft)" strokeWidth="2" {...A('pulseRing','3.2s','50px 44px')} /><rect x="45" y="24" width="10" height="52" fill="var(--pet-ink)" /><rect x="20" y="38" width="26" height="6" fill="var(--pet-ink)" /><rect x="54" y="46" width="26" height="6" fill="var(--pet-ink)" /><g {...A('swaySoft','6s','50px 76px')}><rect x="10" y="22" width="34" height="16" fill="var(--pet-accent)" /><rect x="56" y="30" width="34" height="16" fill="var(--pet-accent)" /><rect x="30" y="6" width="40" height="16" fill="var(--pet-accent)" /><g fill="var(--pet-bg)"><rect x="18" y="28" width="5" height="5" fill="var(--pet-bg)" /><rect x="36" y="12" width="5" height="5" fill="var(--pet-bg)" /><rect x="60" y="12" width="5" height="5" fill="var(--pet-bg)" /><rect x="70" y="36" width="5" height="5" fill="var(--pet-bg)" /></g></g><path d="M26 76h48l-6 14H32Z" fill="var(--pet-soil)" /></>);
  return null;
}


const ART = { blob: Blob, gem: Gem, bird: Bird, plant: Plant, bonsai: Bonsai }

export function Pet({
  species = 'blob',
  level = 1,
  health = 'ok',
  size = 96,
  paused = false,
  interactive = true,
  onPoke,
  className = '',
  title,
  ...rest
}: {
  species?: PetSpecies
  level?: number
  health?: PetHealth
  size?: number
  paused?: boolean
  /** Al tocarla reacciona una vez. Apágalo si ya vive dentro de otro botón. */
  interactive?: boolean
  onPoke?: (info: PetPoke) => void
  className?: string
  title?: string
} & Omit<SVGProps<SVGSVGElement>, 'children'>) {
  const [pokes, setPokes] = useState(0)
  const Art = ART[species] ?? Blob
  const lvl = Math.min(Math.max(Math.round(level), 1), 5)
  const label = title ?? petLabel(species, lvl, health)
  const [anim, ms] = pokeAnim(species, lvl, health)

  const poke = () => {
    if (!interactive || paused) return
    setPokes((n) => n + 1)
    onPoke?.({ species, level: lvl, health, animation: anim })
  }
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    rest.onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      poke()
    }
  }
  const onMouseDown = (event: MouseEvent<SVGSVGElement>) => {
    rest.onMouseDown?.(event)
    if (event.defaultPrevented || !interactive) return
    event.preventDefault()
  }

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      {...rest}
      role={interactive ? 'button' : 'img'}
      aria-label={interactive ? `${label} · tócala` : label}
      tabIndex={interactive ? 0 : undefined}
      onClick={
        interactive
          ? (event) => {
              poke()
              event.currentTarget.blur()
            }
          : rest.onClick
      }
      onKeyDown={interactive ? onKeyDown : rest.onKeyDown}
      onMouseDown={interactive ? onMouseDown : rest.onMouseDown}
      data-paused={paused ? 'true' : 'false'}
      data-interactive={interactive ? 'true' : 'false'}
      data-species={species}
      data-level={lvl}
      data-health={health}
      className={('pet ' + className).trim()}
    >
      <title>{label}</title>
      <rect x="10" y="90" width="80" height="2" fill="var(--pet-mute-2)" />
      <g
        key={pokes}
        className={pokes ? 'p-poke-' + anim : undefined}
        style={pokes ? { animationDuration: ms + 'ms', transformOrigin: '50px 90px', transformBox: 'view-box' } : undefined}
      >
        <Art level={lvl} health={health} />
      </g>
      {pokes > 0 ? <Burst key={'b' + pokes} health={health} /> : null}
    </svg>
  )
}

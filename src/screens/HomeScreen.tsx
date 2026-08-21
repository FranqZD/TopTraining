import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Check, ChevronRight, Flame, Plus, Settings, Users, X } from 'lucide-react'
import { Avatar, Card, CardLabel, DayMark, cn } from '../components/ui'
import {
  api,
  localDay,
  weekDays,
  weekStart,
  type CheckIn,
  type FriendRequests,
  type Group,
} from '../lib/api'
import { thumbnail } from '../lib/photo'
import { useProfile } from '../profile/useProfile'

/**
 * Home. El orden no es casual: primero la acción del día y después tus grupos,
 * que es lo que se mira todos los días. Amigos y ajustes viven en el encabezado
 * como íconos: se entra de vez en cuando y no compiten con lo de arriba.
 */
export function HomeScreen() {
  const { profile } = useProfile()
  const [groups, setGroups] = useState<Group[]>([])
  /** El carrusel no se monta hasta tener los grupos: si nace con la tarjeta de
   *  "crear" sola, el scroll-snap se ancla a ella y al llegar los grupos la
   *  lista aparece corrida hasta el final. */
  const [groupsLoaded, setGroupsLoaded] = useState(false)
  const [pending, setPending] = useState(0)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])

  useEffect(() => {
    api
      .get<Group[]>(`/groups?today=${localDay()}`)
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setGroupsLoaded(true))
    api
      .get<FriendRequests>('/friends/requests')
      .then((requests) => setPending(requests.incoming.length))
      .catch(() => setPending(0))
    // Mis últimos check-ins: con eso salen el estado de hoy y la semana entera.
    api.get<CheckIn[]>('/checkins').then(setCheckIns).catch(() => setCheckIns([]))
  }, [])

  const today = localDay()
  const days = useMemo(() => weekDays(weekStart(today)), [today])
  const done = useMemo(() => new Set(checkIns.map((checkIn) => checkIn.day)), [checkIns])

  const todaysCheckIn = checkIns.find((checkIn) => checkIn.day === today) ?? null
  const checkedInToday = todaysCheckIn !== null

  /**
   * La meta de la semana es la que el usuario declaró: es la misma con la que
   * se calculan las rachas semanales en toda la app. Si nunca la eligió,
   * usamos la más exigente de sus grupos antes que no mostrar nada.
   */
  const goal = profile?.weeklyFrequency ?? Math.max(0, ...groups.map((group) => group.effectiveGoal))
  const doneThisWeek = days.filter((day) => done.has(day)).length
  const missing = Math.max(0, goal - doneThisWeek)

  if (!profile) return null

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="app-frame max-w-[440px] flex flex-col gap-7">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={profile.name} image={profile.image} />
            <div className="min-w-0">
              <p className="tape text-text-faint">Hola</p>
              <p className="text-title truncate">{profile.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Sin tarjeta, las solicitudes pendientes se verían recién al
                entrar: el contador es lo que las mantiene a la vista. */}
            <Link
              to="/friends"
              aria-label={pending > 0 ? `Amigos, ${pending} pendientes` : 'Amigos'}
              className="pressable relative grid place-items-center size-11 rounded-[var(--radius-md)] bg-ink-850 border border-ink-700 text-ink-300 hover:text-ink-50"
            >
              <Users size={20} strokeWidth={2.5} />
              {pending > 0 && (
                <span className="num absolute -top-1 -right-1 grid place-items-center min-w-5 h-5 px-1 rounded-[var(--radius-pill)] bg-accent text-on-accent text-micro">
                  {pending}
                </span>
              )}
            </Link>
            <Link
              to="/settings"
              aria-label="Ajustes"
              className="pressable grid place-items-center size-11 rounded-[var(--radius-md)] bg-ink-850 border border-ink-700 text-ink-300 hover:text-ink-50"
            >
              <Settings size={20} strokeWidth={2.5} />
            </Link>
          </div>
        </header>

        {/* ------------------------------------------------------------------
            La acción del día: primer bloque, ancho completo, siempre visible.
            No hace falta entrar a ningún grupo para marcar. La semana va
            adentro de la misma tarjeta — marcar hoy y ver cómo viene la
            semana son la misma pregunta.
           ------------------------------------------------------------------ */}
        <section aria-label="Check-in de hoy">
          {checkedInToday ? (
            <Link
              to="/checkin"
              className="pressable flex flex-col gap-4 p-4 rounded-[var(--radius-lg)] notch bg-success-tint border border-success/45"
            >
              <span className="flex items-center gap-4">
                <DayMark state="done" size="lg" />
                <span className="flex-1 min-w-0">
                  <span className="block text-title leading-tight">Ya entrenaste hoy</span>
                  <span className="block text-caption text-text-muted truncate">
                    {todaysCheckIn?.note ? todaysCheckIn.note : 'Toca para editarlo o deshacerlo.'}
                  </span>
                </span>
                {todaysCheckIn?.photoUrl ? (
                  <img
                    src={thumbnail(todaysCheckIn.photoUrl, 120)}
                    alt=""
                    className="size-12 rounded-[var(--radius-md)] object-cover border border-success/30 shrink-0"
                  />
                ) : (
                  <ChevronRight size={22} strokeWidth={3} className="shrink-0 text-text-faint" />
                )}
              </span>
              <WeekStrip days={days} today={today} done={done} tone="surface" />
            </Link>
          ) : (
            <Link
              to="/checkin"
              className="pressable flex flex-col gap-4 p-4 rounded-[var(--radius-lg)] notch bg-accent text-on-accent shadow-accent"
            >
              <span className="flex items-center gap-4">
                <span className="grid place-items-center size-12 rounded-[var(--radius-md)] bg-on-accent/12 shrink-0">
                  <Flame size={26} strokeWidth={2.5} fill="currentColor" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-title leading-tight">Marcar hoy</span>
                  <span className="block text-caption opacity-80 truncate">
                    {goal <= 0
                      ? 'Un toque y queda registrado.'
                      : missing > 0
                        ? `Te ${missing === 1 ? 'falta' : 'faltan'} ${missing} para la meta de ${goal}×`
                        : `Meta de ${goal}× cumplida. Lo de hoy es de más.`}
                  </span>
                </span>
                <ChevronRight size={22} strokeWidth={3} className="shrink-0 opacity-70" />
              </span>
              <WeekStrip days={days} today={today} done={done} tone="accent" />
            </Link>
          )}
        </section>

        {/* --- Grupos: carrusel horizontal, uno al lado del otro --- */}
        <section className="flex flex-col gap-3 pb-10">
          <div className="flex items-center justify-between gap-3">
            <CardLabel className="mb-0">Tus grupos{groupsLoaded && ` (${groups.length})`}</CardLabel>
            <Link to="/groups/join" className="tape text-accent hover:underline">
              tengo un código
            </Link>
          </div>

          {groupsLoaded && groups.length === 0 && (
            <Card tone="outline">
              <p className="text-body text-ink-200">Todavía no estás en ningún grupo.</p>
              <p className="text-caption text-text-faint mt-1">
                Un grupo es el viaje, la meta y la gente que te va a echar carrilla si no vas.
              </p>
            </Card>
          )}

          {/* Se sale del margen del marco a propósito: la tarjeta cortada en el
              borde es lo que avisa que hay más para el costado. */}
          <div className="scroll-x -mx-5 px-5 scroll-pl-5 flex gap-3 snap-x min-h-[8.5rem]">
            {groupsLoaded && (
              <>
                {groups.map((group) => (
                  <GroupCard key={group.id} group={group} />
                ))}

                <Link
                  to="/groups/new"
                  className={cn(
                    'pressable snap-start shrink-0 flex flex-col justify-center gap-2 p-4 min-h-[8.5rem]',
                    'rounded-[var(--radius-lg)] border border-dashed border-ink-600 text-ink-200',
                    'hover:border-accent hover:text-text',
                    groups.length === 0 ? 'w-full' : 'w-40',
                  )}
                >
                  <Plus size={22} strokeWidth={3} />
                  <span className="font-bold leading-tight">Crear un grupo</span>
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

/** Tarjeta de grupo del carrusel: quién es, cuánta gente y cómo va el día. */
function GroupCard({ group }: { group: Group }) {
  const ratio = group.memberCount > 0 ? group.metToday / group.memberCount : 0

  return (
    <Link
      to={`/groups/${group.id}`}
      className="pressable snap-start shrink-0 w-60 flex flex-col gap-3 p-4 min-h-[8.5rem] rounded-[var(--radius-lg)] bg-surface border border-line-soft shadow-card hover:border-ink-600"
    >
      <span className="block min-w-0">
        <span className="block text-title truncate leading-tight">{group.name}</span>
        <span className="block text-caption text-text-faint mt-1">
          {group.memberCount} {group.memberCount === 1 ? 'miembro' : 'miembros'} ·{' '}
          {group.metToday} {group.metToday === 1 ? 'cumplió' : 'cumplieron'} hoy
        </span>
      </span>

      <span
        className="mt-auto block h-1.5 rounded-full bg-ink-800 overflow-hidden"
        role="progressbar"
        aria-label={`${group.metToday} de ${group.memberCount} marcaron hoy`}
        aria-valuemin={0}
        aria-valuemax={group.memberCount}
        aria-valuenow={group.metToday}
      >
        <span
          className="block h-full bg-success transition-[width] duration-[var(--duration-base)]"
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
    </Link>
  )
}

const WEEKDAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/**
 * La semana de lunes a domingo, adentro de la tarjeta de hoy.
 *
 * El tono cambia según sobre qué está apoyada: en la tarjeta de acento todo se
 * dibuja con `on-accent` (la regla de la marca: sobre el acento, casi negro);
 * en la verde, con los colores de estado de siempre.
 */
function WeekStrip({
  days,
  today,
  done,
  tone,
}: {
  days: string[]
  today: string
  done: Set<string>
  tone: 'accent' | 'surface'
}) {
  const box = 'grid place-items-center h-9 rounded-[var(--radius-sm)]'
  const styles = {
    accent: {
      done: 'bg-on-accent text-accent',
      today: 'border-2 border-dashed border-on-accent/50 text-on-accent',
      missed: 'bg-on-accent/12 text-on-accent/40',
      future: 'bg-on-accent/12',
      letter: 'text-on-accent/65',
    },
    surface: {
      done: 'bg-success text-ink-1000',
      today: 'border-2 border-dashed border-accent text-accent',
      missed: 'bg-ink-850 border border-ink-700 text-danger/70',
      future: 'bg-ink-850 border border-ink-700',
      letter: 'text-text-faint',
    },
  }[tone]

  return (
    <span className="grid grid-cols-7 gap-1.5">
      {days.map((day, index) => {
        const state = done.has(day) ? 'done' : day === today ? 'today' : day < today ? 'missed' : 'future'

        return (
          <span key={day} className="flex flex-col items-center gap-1">
            <span className={cn(box, 'w-full', styles[state])}>
              {state === 'done' && <Check size={18} strokeWidth={3.25} absoluteStrokeWidth />}
              {state === 'missed' && <X size={14} strokeWidth={3} absoluteStrokeWidth />}
            </span>
            <span className={cn('tape', styles.letter)} aria-hidden>
              {WEEKDAY_INITIALS[index]}
            </span>
          </span>
        )
      })}
    </span>
  )
}

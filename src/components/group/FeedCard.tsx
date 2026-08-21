import { motion } from 'motion/react'
import { Flame, MessageCircle } from 'lucide-react'
import { Avatar, Card, DayMark } from '../ui'
import { relativeTime, EMPTY_VOTES, type FeedItem, type VoteResult } from '../../lib/api'
import { thumbnail } from '../../lib/photo'
import { VoteBar } from './VoteBar'

/**
 * Una tarjeta del feed. La misma pieza se usa en el scroll del grupo y al
 * abrir un día del calendario: si se viera distinto, el calendario mentiría.
 *
 * La barra de aura se llena con los votos de aura vs. la gente del grupo.
 * Fuera de un grupo, se muestra llena: solo importa cuánta aura generó el post.
 */
export function FeedCard({
  item,
  index = 0,
  onOpen,
  onAuthor,
  flexToday,
  onVoted,
  memberCount,
}: {
  item: FeedItem
  index?: number
  onOpen: () => void
  /** Si está, el nombre y el avatar abren el feed de esa persona. */
  onAuthor?: (userId: string) => void
  flexToday?: string | null
  onVoted?: (checkInId: string, result: VoteResult) => void
  /** null / undefined: no hay grupo, la barra va llena. */
  memberCount?: number | null
}) {
  const bare = !item.photoUrl && !item.note
  const aura = item.votes?.like ?? 0
  const fill =
    memberCount && memberCount > 0 ? Math.min(100, (aura / memberCount) * 100) : 100

  const identity = (
    <>
      <Avatar name={item.author.name} image={item.author.image} size={40} />
      <div className="flex-1 min-w-0">
        <p className="font-bold truncate leading-tight">{item.author.name}</p>
        <p className="tape text-text-faint mt-0.5 flex items-center gap-1.5">
          <span>{relativeTime(item.createdAt)}</span>
          {item.streaks.daily > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-0.5 text-accent">
                <Flame size={11} strokeWidth={2.5} fill="currentColor" />
                {item.streaks.daily} {item.streaks.daily === 1 ? 'día' : 'días'}
              </span>
            </>
          )}
        </p>
      </div>
    </>
  )

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay: Math.min(index, 6) * 0.03, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="flex flex-col gap-3 !p-4">
        <div className="flex items-start gap-3">
          {onAuthor ? (
            <button
              type="button"
              onClick={() => onAuthor(item.author.id)}
              aria-label={`Ver entrenos de ${item.author.name}`}
              className="pressable flex items-center gap-3 min-w-0 flex-1 min-h-[var(--size-touch)] -my-1 text-left cursor-pointer rounded-[var(--radius-sm)]"
            >
              {identity}
            </button>
          ) : (
            <header className="flex items-center gap-3 min-w-0 flex-1">{identity}</header>
          )}

          <div className="shrink-0 text-right leading-none pt-0.5">
            <p className="num text-headline text-success">{aura}</p>
            <p className="tape text-success mt-1">de aura</p>
          </div>
        </div>

        <div
          className="h-1 rounded-full bg-ink-800 overflow-hidden"
          role="progressbar"
          aria-label="Aura del grupo"
          aria-valuemin={0}
          aria-valuemax={memberCount && memberCount > 0 ? memberCount : aura || 1}
          aria-valuenow={aura}
        >
          <motion.span
            className="block h-full w-full rounded-full bg-success origin-left"
            initial={false}
            animate={{ scaleX: fill / 100 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {item.photoUrl && (
          <button type="button" onClick={onOpen} className="pressable block cursor-pointer">
            <img
              src={thumbnail(item.photoUrl, 700)}
              alt={`Entrenamiento de ${item.author.name}`}
              loading="lazy"
              className="w-full aspect-square object-cover rounded-[var(--radius-md)] border border-ink-800"
            />
          </button>
        )}

        {item.note && <p className="text-title text-ink-100">{item.note}</p>}

        {bare && (
          <div className="flex items-center gap-3 py-1">
            <DayMark state="done" size="md" />
            <p className="text-body text-ink-200">Marcó que entrenó</p>
          </div>
        )}

        <VoteBar
          checkInId={item.id}
          votes={item.votes ?? EMPTY_VOTES}
          flexToday={flexToday ?? null}
          onVoted={(result) => onVoted?.(item.id, result)}
        />

        <button
          type="button"
          onClick={onOpen}
          className="pressable flex items-center gap-2 self-start min-h-[var(--size-touch)] -my-1 pr-3 text-text-faint hover:text-accent-text cursor-pointer"
        >
          <MessageCircle size={17} strokeWidth={2.5} />
          <span className="text-caption font-bold">
            {item.commentCount === 0 ? 'Comentar' : `Comentar · ${item.commentCount}`}
          </span>
        </button>
      </Card>
    </motion.article>
  )
}

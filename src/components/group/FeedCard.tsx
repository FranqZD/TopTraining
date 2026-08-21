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
 * La barra se llena en verde (aura) y rojo (laura) según los votos del
 * grupo. Fuera de un grupo, se llena con la proporción de aura vs. laura.
 */
export function FeedCard({
  item,
  index = 0,
  onOpen,
  onAuthor,
  onVoted,
  memberCount,
  canVote = false,
}: {
  item: FeedItem
  index?: number
  onOpen: () => void
  /** Si está, el nombre y el avatar abren el feed de esa persona. */
  onAuthor?: (userId: string) => void
  onVoted?: (checkInId: string, result: VoteResult) => void
  /** null / undefined: no hay grupo, la barra va llena. */
  memberCount?: number | null
  /** Si todavía no entrenó hoy, mira pero no vota. */
  canVote?: boolean
}) {
  const bare = !item.photoUrl && !item.note
  const aura = item.votes?.like ?? 0
  const laura = item.votes?.laura ?? 0
  const voted = aura + laura
  const capacity = memberCount && memberCount > 0 ? memberCount : Math.max(voted, 1)
  const auraPct = (aura / capacity) * 100
  const lauraPct = (laura / capacity) * 100

  const identity = (
    <>
      <Avatar name={item.author.name} image={item.author.image} size={40} />
      <div className="flex-1 min-w-0">
        <p className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold truncate leading-tight">{item.author.name}</span>
          {item.streaks.daily > 0 && (
            <span className="inline-flex items-center gap-0.5 text-accent shrink-0">
              <Flame size={12} strokeWidth={2.5} fill="currentColor" />
              <span className="num text-caption">{item.streaks.daily}</span>
            </span>
          )}
        </p>
        <p className="tape text-text-faint mt-0.5">{relativeTime(item.createdAt)}</p>
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
        <div className="flex items-center gap-3">
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

          <div className="shrink-0 flex items-baseline gap-3 leading-none">
            <p className="num text-headline text-success">{aura}</p>
            <p className="num text-headline text-danger">{laura}</p>
          </div>
        </div>

        <div
          className="flex h-1.5 rounded-full bg-ink-800 overflow-hidden"
          role="progressbar"
          aria-label="Aura y Laura"
          aria-valuemin={0}
          aria-valuemax={capacity}
          aria-valuenow={voted}
        >
          {auraPct > 0 && (
            <motion.span
              className="h-full bg-success"
              initial={false}
              animate={{ width: `${auraPct}%` }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
          {lauraPct > 0 && (
            <motion.span
              className="h-full bg-danger"
              initial={false}
              animate={{ width: `${lauraPct}%` }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
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
                  canVote={canVote}
                  onVoted={(result) => onVoted?.(item.id, result)}
                />

        <button
          type="button"
          onClick={onOpen}
          className="pressable flex items-center justify-center gap-2 w-full min-h-[var(--size-control)] rounded-[var(--radius-md)] bg-ink-850 border border-ink-800 text-text-muted hover:text-text hover:border-ink-700 cursor-pointer"
        >
          <MessageCircle size={20} strokeWidth={2.5} />
          <span className="text-body font-bold">
            {item.commentCount === 0 ? 'Comentar' : `Comentar · ${item.commentCount}`}
          </span>
        </button>
      </Card>
    </motion.article>
  )
}

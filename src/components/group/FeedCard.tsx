import { motion } from 'motion/react'
import { Flame, MessageCircle, Trash2 } from 'lucide-react'
import { Avatar, Card, DayMark } from '../ui'
import { relativeTime, EMPTY_VOTES, isGroupPost, type FeedItem, type VoteResult, type VoteWallet } from '../../lib/api'
import { useProfile } from '../../profile/useProfile'
import { thumbnail, photoUrls } from '../../lib/photo'
import { VoteBar } from './VoteBar'
import { PhotoCarousel } from './PhotoCarousel'

/**
 * Una tarjeta del feed. La misma pieza se usa en el scroll del grupo y al
 * abrir un día del calendario: si se viera distinto, el calendario mentiría.
 *
 * Un post de texto no se vota ni se comenta: es un aviso, no un entreno.
 * En los entrenos, la barra es la proporción de los votos que ya hay: un
 * aura sola llena todo de verde; uno de cada, mitad y mitad. Sin votos,
 * queda vacía.
 */
export function FeedCard({
  item,
  index = 0,
  onOpen,
  onAuthor,
  onVoted,
  onDelete,
  canVote = false,
  wallet,
  canModerate = false,
}: {
  item: FeedItem
  index?: number
  onOpen?: () => void
  /** Si está, el nombre y el avatar abren el feed de esa persona. */
  onAuthor?: (userId: string) => void
  onVoted?: (checkInId: string, result: VoteResult) => void
  /** Borrar un post: autor o dueño del grupo. */
  onDelete?: () => void
  /** false si nunca entrenó: no hay cupo para votar. */
  canVote?: boolean
  wallet?: VoteWallet
  canModerate?: boolean
}) {
  const { profile } = useProfile()
  const post = isGroupPost(item)
  const urls = photoUrls(item).map((url) => thumbnail(url, 700))
  const bare = !post && urls.length === 0 && !item.note
  const aura = item.votes?.like ?? 0
  const laura = item.votes?.laura ?? 0
  const voted = aura + laura
  const auraPct = voted > 0 ? (aura / voted) * 100 : 0
  const lauraPct = voted > 0 ? (laura / voted) * 100 : 0
  const own = Boolean(profile && profile.id === item.author.id)
  const canDelete = post && Boolean(onDelete) && (canModerate || own)

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
        <p className="tape text-text-faint mt-0.5">
          {post ? `Post · ${relativeTime(item.createdAt)}` : relativeTime(item.createdAt)}
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

          {post ? (
            canDelete && (
              <button
                type="button"
                onClick={onDelete}
                aria-label="Borrar post"
                className="pressable grid place-items-center size-11 shrink-0 rounded-[var(--radius-md)] text-ink-400 hover:text-danger hover:bg-ink-850 cursor-pointer"
              >
                <Trash2 size={18} strokeWidth={2.5} />
              </button>
            )
          ) : (
            <div className="shrink-0 flex items-baseline gap-3 leading-none">
              <p className="num text-headline text-success">{aura}</p>
              <p className="num text-headline text-danger">{laura}</p>
            </div>
          )}
        </div>

        {!post && (
          <div
            className="flex h-1.5 rounded-full bg-ink-800 overflow-hidden"
            role="progressbar"
            aria-label="Aura y Laura"
            aria-valuemin={0}
            aria-valuemax={voted}
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
        )}

        {urls.length > 0 && (
          <PhotoCarousel
            urls={urls}
            alt={`Entrenamiento de ${item.author.name}`}
            onOpen={onOpen}
            className="rounded-[var(--radius-md)] border border-ink-800"
          />
        )}

        {item.note && (
          <p className={post ? 'text-body text-ink-100 whitespace-pre-wrap break-words' : 'text-title text-ink-100'}>
            {item.note}
          </p>
        )}

        {bare && (
          <div className="flex items-center gap-3 py-1">
            <DayMark state="done" size="md" />
            <p className="text-body text-ink-200">Marcó que entrenó</p>
          </div>
        )}

        {!post && (
          <>
            {!own && (
              <VoteBar
                checkInId={item.id}
                votes={item.votes ?? EMPTY_VOTES}
                canVote={canVote}
                wallet={wallet}
                onVoted={(result) => onVoted?.(item.id, result)}
              />
            )}

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
          </>
        )}
      </Card>
    </motion.article>
  )
}

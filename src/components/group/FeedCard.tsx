import { motion } from 'motion/react'
import { MessageCircle } from 'lucide-react'
import { Avatar, Card, DayMark, StreakBadge } from '../ui'
import { relativeTime, type FeedItem } from '../../lib/api'
import { thumbnail } from '../../lib/photo'

/**
 * Una tarjeta del feed. La misma pieza se usa en el scroll del grupo y al
 * abrir un día del calendario: si se viera distinto, el calendario mentiría.
 */
export function FeedCard({
  item,
  index = 0,
  onOpen,
  onAuthor,
}: {
  item: FeedItem
  index?: number
  onOpen: () => void
  /** Si está, el nombre y el avatar abren el feed de esa persona. */
  onAuthor?: (userId: string) => void
}) {
  const bare = !item.photoUrl && !item.note

  const identity = (
    <>
      <Avatar name={item.author.name} image={item.author.image} size={40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold truncate leading-tight">{item.author.name}</span>
          {item.streaks.daily > 0 && <StreakBadge days={item.streaks.daily} size="sm" />}
        </div>
        <span className="tape text-text-faint">{relativeTime(item.createdAt)}</span>
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
        {onAuthor ? (
          <button
            type="button"
            onClick={() => onAuthor(item.author.id)}
            aria-label={`Ver entrenos de ${item.author.name}`}
            className="pressable flex items-center gap-3 min-h-[var(--size-touch)] -my-1 text-left cursor-pointer rounded-[var(--radius-sm)]"
          >
            {identity}
          </button>
        ) : (
          <header className="flex items-center gap-3">{identity}</header>
        )}

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

        {item.note && <p className="text-body text-ink-100">{item.note}</p>}

        {bare && (
          <div className="flex items-center gap-3 py-1">
            <DayMark state="done" size="md" />
            <p className="text-body text-ink-200">Marcó que entrenó</p>
          </div>
        )}

        <button
          type="button"
          onClick={onOpen}
          className="pressable flex items-center gap-2 self-start min-h-[var(--size-touch)] -my-1 pr-3 text-text-faint hover:text-accent-text cursor-pointer"
        >
          <MessageCircle size={17} strokeWidth={2.5} />
          <span className="text-caption font-bold">
            {item.commentCount === 0
              ? 'Comentar'
              : `${item.commentCount} ${item.commentCount === 1 ? 'comentario' : 'comentarios'}`}
          </span>
        </button>
      </Card>
    </motion.article>
  )
}

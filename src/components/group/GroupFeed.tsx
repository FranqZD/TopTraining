import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Loader2, MessageCircle } from 'lucide-react'
import { Avatar, Button, Card, DayMark, StreakBadge } from '../ui'
import { api, localDay, relativeTime, type FeedItem, type FeedPage } from '../../lib/api'
import { thumbnail } from '../../lib/photo'
import { CheckInSheet } from './CheckInSheet'

const PAGE_SIZE = 25

/**
 * Feed del grupo: los check-ins de todos, del más nuevo al más viejo.
 * Pagina con cursor y carga sola al llegar al final — nadie quiere apretar
 * "siguiente" en un feed.
 */
export function GroupFeed({ groupId }: { groupId: string }) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [exhausted, setExhausted] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const sentinel = useRef<HTMLDivElement>(null)

  const loadPage = useCallback(
    async (from: string | null) => {
      setLoading(true)
      try {
        const query = new URLSearchParams({ limit: String(PAGE_SIZE), today: localDay() })
        if (from) query.set('cursor', from)
        const page = await api.get<FeedPage>(`/groups/${groupId}/feed?${query}`)
        setItems((current) => (from ? [...current, ...page.items] : page.items))
        setCursor(page.nextCursor)
        setExhausted(page.nextCursor === null)
      } catch {
        setExhausted(true)
      } finally {
        setLoading(false)
      }
    },
    [groupId],
  )

  useEffect(() => {
    void loadPage(null)
  }, [loadPage])

  // Carga la página siguiente cuando el final entra en pantalla.
  useEffect(() => {
    const node = sentinel.current
    if (!node || exhausted || loading || !cursor) return
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && void loadPage(cursor),
      { rootMargin: '400px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [cursor, exhausted, loading, loadPage])

  if (loading && items.length === 0) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 size={26} strokeWidth={2.5} className="animate-spin text-accent" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card tone="outline" className="text-center">
        <p className="text-body text-ink-200">Todavía no entrenó nadie.</p>
        <p className="text-caption text-text-faint mt-1">Sé el primero y después cargalos a todos.</p>
      </Card>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <FeedCard key={item.id} item={item} index={index} onOpen={() => setOpenId(item.id)} />
        ))}

        <div ref={sentinel} className="h-4" />

        {loading && items.length > 0 && (
          <div className="grid place-items-center py-4">
            <Loader2 size={20} strokeWidth={2.5} className="animate-spin text-ink-500" />
          </div>
        )}

        {/* Respaldo por si el observer no dispara (o el usuario prefiere tocar). */}
        {!loading && cursor && (
          <Button variant="secondary" fullWidth onClick={() => void loadPage(cursor)}>
            Ver más
          </Button>
        )}

        {exhausted && items.length >= PAGE_SIZE && (
          <p className="tape text-ink-500 text-center py-4">Eso es todo</p>
        )}
      </div>

      <CheckInSheet
        checkInId={openId}
        onClose={() => setOpenId(null)}
        onCommented={() =>
          setItems((current) =>
            current.map((item) => (item.id === openId ? { ...item, commentCount: item.commentCount + 1 } : item)),
          )
        }
      />
    </>
  )
}

function FeedCard({ item, index, onOpen }: { item: FeedItem; index: number; onOpen: () => void }) {
  const bare = !item.photoUrl && !item.note

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay: Math.min(index, 6) * 0.03, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="flex flex-col gap-3 !p-4">
        <header className="flex items-center gap-3">
          <Avatar name={item.author.name} image={item.author.image} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold truncate leading-tight">{item.author.name}</span>
              {/* La llama solo aparece si la racha diaria está viva. */}
              {item.streaks.daily > 0 && <StreakBadge days={item.streaks.daily} size="sm" />}
            </div>
            <span className="tape text-text-faint">{relativeTime(item.createdAt)}</span>
          </div>
        </header>

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

        {/* Sin foto ni texto: igual entrenó, y eso es lo que cuenta. */}
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

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button, Card, CardLabel, Sheet } from '../ui'
import { api, isGroupPost, localDay, shiftDay, type FeedItem, type FeedPage, type VoteResult } from '../../lib/api'
import { CheckInSheet } from './CheckInSheet'
import { FeedCard } from './FeedCard'
import { applyVoteResult } from './VoteBar'

const PAGE_SIZE = 25

/**
 * Lista paginada del feed. La usan el grupo (entrenos + posts) y el de una
 * persona (solo entrenos): misma tarjeta, mismo scroll.
 */
export function FeedList({
  sourceKey,
  loadPage,
  empty,
  emptyHint,
  onAuthor,
  groupId,
  canModerate = false,
}: {
  /** Si cambia, se reinicia la lista (otro grupo, otra persona). */
  sourceKey: string
  loadPage: (cursor: string | null) => Promise<FeedPage>
  empty: string
  emptyHint?: string
  onAuthor?: (userId: string) => void
  /** Si está, los posts de este grupo se pueden borrar. */
  groupId?: string
  /** Dueño del grupo: puede borrar posts ajenos. */
  canModerate?: boolean
}) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [exhausted, setExhausted] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [canVote, setCanVote] = useState(false)
  const sentinel = useRef<HTMLDivElement>(null)

  const fetchPage = useCallback(
    async (from: string | null) => {
      setLoading(true)
      try {
        const page = await loadPage(from)
        setItems((current) => (from ? [...current, ...page.items] : page.items))
        setCursor(page.nextCursor)
        setExhausted(page.nextCursor === null)
        setCanVote(page.canVote)
      } catch {
        if (!from) setItems([])
        setExhausted(true)
      } finally {
        setLoading(false)
      }
    },
    [loadPage],
  )

  useEffect(() => {
    setItems([])
    setCursor(null)
    setExhausted(false)
    setOpenId(null)
    setDeleteId(null)
    setCanVote(false)
    void fetchPage(null)
  }, [sourceKey, fetchPage])

  useEffect(() => {
    const node = sentinel.current
    if (!node || exhausted || loading || !cursor) return
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && void fetchPage(cursor),
      { rootMargin: '400px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [cursor, exhausted, loading, fetchPage])

  const onVoted = (checkInId: string, result: VoteResult) => {
    setItems((current) => applyVoteResult(current, checkInId, result))
  }

  const confirmDelete = async () => {
    if (!groupId || !deleteId) return
    setDeleting(true)
    try {
      await api.del(`/groups/${groupId}/posts/${deleteId}`)
      setItems((current) => current.filter((item) => item.id !== deleteId))
      setDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

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
        <p className="text-body text-ink-200">{empty}</p>
        {emptyHint && <p className="text-caption text-text-faint mt-1">{emptyHint}</p>}
      </Card>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        {groupByDay(items).map((section) => (
          <section key={section.day} className="flex flex-col gap-3">
            <CardLabel className="mb-0">{feedDayLabel(section.day)}</CardLabel>
            {section.items.map((item, index) => (
              <FeedCard
                key={item.id}
                item={item}
                index={index}
                onOpen={isGroupPost(item) ? undefined : () => setOpenId(item.id)}
                onAuthor={onAuthor}
                onVoted={onVoted}
                onDelete={groupId && isGroupPost(item) ? () => setDeleteId(item.id) : undefined}
                canVote={canVote}
                canModerate={canModerate}
              />
            ))}
          </section>
        ))}

        <div ref={sentinel} className="h-4" />

        {loading && items.length > 0 && (
          <div className="grid place-items-center py-4">
            <Loader2 size={20} strokeWidth={2.5} className="animate-spin text-ink-500" />
          </div>
        )}

        {!loading && cursor && (
          <Button variant="secondary" fullWidth onClick={() => void fetchPage(cursor)}>
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
        onVoted={(checkInId, result) => onVoted(checkInId, result)}
      />

      <Sheet
        open={deleteId !== null}
        onClose={() => !deleting && setDeleteId(null)}
        title={<span className="text-title">¿Borrar este post?</span>}
      >
        <div className="flex flex-col gap-4">
          <p className="text-body text-text-muted">Desaparece del feed del grupo. No hay vuelta atrás.</p>
          <div className="flex flex-col gap-2 pt-1">
            <Button
              size="lg"
              variant="danger"
              fullWidth
              onClick={() => void confirmDelete()}
              disabled={deleting}
              icon={
                deleting ? (
                  <Loader2 size={18} strokeWidth={2.5} className="animate-spin" />
                ) : (
                  <Trash2 size={18} strokeWidth={2.5} />
                )
              }
            >
              Sí, borrar
            </Button>
            <Button size="lg" variant="secondary" fullWidth onClick={() => setDeleteId(null)} disabled={deleting}>
              Dejarlo
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  )
}

function groupByDay(items: FeedItem[]): { day: string; items: FeedItem[] }[] {
  const sections: { day: string; items: FeedItem[] }[] = []
  for (const item of items) {
    const last = sections[sections.length - 1]
    if (last && last.day === item.day) last.items.push(item)
    else sections.push({ day: item.day, items: [item] })
  }
  return sections
}

function feedDayLabel(day: string): string {
  const today = localDay()
  if (day === today) return 'Hoy'
  if (day === shiftDay(today, -1)) return 'Ayer'
  const [year, month, date] = day.split('-').map(Number)
  const label = new Date(Date.UTC(year!, month! - 1, date)).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: year !== Number(today.slice(0, 4)) ? 'numeric' : undefined,
    timeZone: 'UTC',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

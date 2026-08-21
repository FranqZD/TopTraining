import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button, Card, CardLabel } from '../ui'
import { localDay, shiftDay, type FeedItem, type FeedPage, type VoteResult } from '../../lib/api'
import { CheckInSheet } from './CheckInSheet'
import { FeedCard } from './FeedCard'
import { applyVoteResult } from './VoteBar'

const PAGE_SIZE = 25

/**
 * Lista paginada de entrenos. La usan el feed del grupo y el de una persona:
 * misma tarjeta, mismo scroll, mismo sheet de comentarios.
 */
export function FeedList({
  sourceKey,
  loadPage,
  empty,
  emptyHint,
  onAuthor,
}: {
  /** Si cambia, se reinicia la lista (otro grupo, otra persona). */
  sourceKey: string
  loadPage: (cursor: string | null) => Promise<FeedPage>
  empty: string
  emptyHint?: string
  onAuthor?: (userId: string) => void
}) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [exhausted, setExhausted] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [memberCount, setMemberCount] = useState<number | null>(null)
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
        if (!from) setMemberCount(page.memberCount)
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
    setMemberCount(null)
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
                onOpen={() => setOpenId(item.id)}
                onAuthor={onAuthor}
                onVoted={onVoted}
                memberCount={memberCount}
                canVote={canVote}
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

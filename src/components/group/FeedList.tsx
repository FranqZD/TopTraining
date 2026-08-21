import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button, Card } from '../ui'
import type { FeedItem, FeedPage } from '../../lib/api'
import { CheckInSheet } from './CheckInSheet'
import { FeedCard } from './FeedCard'

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
  const sentinel = useRef<HTMLDivElement>(null)

  const fetchPage = useCallback(
    async (from: string | null) => {
      setLoading(true)
      try {
        const page = await loadPage(from)
        setItems((current) => (from ? [...current, ...page.items] : page.items))
        setCursor(page.nextCursor)
        setExhausted(page.nextCursor === null)
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
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <FeedCard
            key={item.id}
            item={item}
            index={index}
            onOpen={() => setOpenId(item.id)}
            onAuthor={onAuthor}
          />
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
      />
    </>
  )
}

import { BicepsFlexed, Heart, ThumbsUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../ui'
import { api, localDay, EMPTY_VOTES, type FeedItem, type VoteKind, type VoteResult, type VoteTally } from '../../lib/api'

export function applyVoteResult(items: FeedItem[], targetId: string, result: VoteResult): FeedItem[] {
  return items.map((item) => {
    if (item.id === targetId) return { ...item, votes: result.votes }
    if (result.movedFrom && item.id === result.movedFrom) {
      const current = item.votes ?? EMPTY_VOTES
      return {
        ...item,
        votes: {
          ...current,
          flex: Math.max(0, current.flex - 1),
          mine: current.mine.filter((kind) => kind !== 'flex'),
        },
      }
    }
    return item
  })
}

/**
 * Tres votos: aura, laura, y el músculo (súper voto, uno por día).
 * Aura y Laura se pisan entre sí. El músculo, si ya lo usaste, se mueve.
 */
export function VoteBar({
  checkInId,
  votes,
  flexToday,
  onVoted,
}: {
  checkInId: string
  votes: VoteTally
  flexToday: string | null
  onVoted: (result: VoteResult) => void
}) {
  const tally = votes ?? EMPTY_VOTES
  const mine = new Set(tally.mine)
  const flexedHere = flexToday === checkInId
  const flexedElsewhere = Boolean(flexToday && flexToday !== checkInId)

  const toggle = async (kind: VoteKind) => {
    const result = await api.post<VoteResult>(`/checkins/${checkInId}/votes`, {
      kind,
      day: localDay(),
    })
    onVoted(result)
  }

  return (
    <div className="flex items-center gap-1">
      <VoteButton
        label="Aura"
        count={tally.like}
        active={mine.has('like')}
        activeClass="text-text"
        onClick={() => void toggle('like')}
      >
        <ThumbsUp size={18} strokeWidth={2.5} fill={mine.has('like') ? 'currentColor' : 'none'} />
      </VoteButton>
      <VoteButton
        label="Laura"
        count={tally.laura}
        active={mine.has('laura')}
        activeClass="text-text"
        onClick={() => void toggle('laura')}
      >
        <Heart size={18} strokeWidth={2.5} fill={mine.has('laura') ? 'currentColor' : 'none'} />
      </VoteButton>
      <VoteButton
        label={flexedElsewhere ? 'Mover el músculo acá' : 'Súper voto'}
        count={tally.flex}
        active={flexedHere}
        activeClass="text-accent"
        onClick={() => void toggle('flex')}
      >
        <BicepsFlexed size={18} strokeWidth={2.5} fill={flexedHere ? 'currentColor' : 'none'} />
      </VoteButton>
    </div>
  )
}

function VoteButton({
  label,
  count,
  active,
  activeClass,
  onClick,
  children,
}: {
  label: string
  count: number
  active: boolean
  activeClass: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'pressable inline-flex items-center gap-1.5 min-h-[var(--size-touch)] px-2.5 -ml-2 rounded-[var(--radius-sm)] cursor-pointer',
        active ? activeClass : 'text-text-faint hover:text-text',
      )}
    >
      {children}
      {count > 0 && <span className="num text-caption leading-none">{count}</span>}
    </button>
  )
}

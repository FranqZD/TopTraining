import { Banana, BicepsFlexed, Flame } from 'lucide-react'
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
 * Tres votos a lo ancho de la card: aura (fuego), músculo (uno por día) y
 * laura (plátano). Aura y Laura se pisan. El músculo, si ya lo usaste, se mueve.
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
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[var(--radius-md)] bg-ink-800">
      <VoteCell
        label="Aura"
        active={mine.has('like')}
        tone="success"
        onClick={() => void toggle('like')}
      >
        <Flame size={22} strokeWidth={2.5} fill={mine.has('like') ? 'currentColor' : 'none'} />
      </VoteCell>

      <VoteCell
        label={flexedElsewhere ? 'Mover el súper voto acá' : 'Súper voto, uno por día'}
        active={flexedHere}
        tone="accent"
        onClick={() => void toggle('flex')}
      >
        <span className="tape absolute top-1.5 right-2 text-text-faint">1/día</span>
        <BicepsFlexed size={22} strokeWidth={2.5} fill={flexedHere ? 'currentColor' : 'none'} />
      </VoteCell>

      <VoteCell
        label="Laura"
        active={mine.has('laura')}
        tone="danger"
        onClick={() => void toggle('laura')}
      >
        <Banana size={22} strokeWidth={2.5} fill={mine.has('laura') ? 'currentColor' : 'none'} />
        <span className="tape">Laura</span>
      </VoteCell>
    </div>
  )
}

function VoteCell({
  label,
  active,
  tone,
  onClick,
  children,
}: {
  label: string
  active: boolean
  tone: 'success' | 'accent' | 'danger'
  onClick: () => void
  children: ReactNode
}) {
  const tones = {
    success: active ? 'bg-success-tint text-success' : 'bg-ink-850 text-success/80',
    accent: active ? 'bg-accent-tint text-accent' : 'bg-ink-850 text-text-muted',
    danger: active ? 'bg-danger-tint text-danger' : 'bg-ink-850 text-danger',
  }

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
        'pressable relative flex flex-col items-center justify-center gap-1.5 py-3 min-h-[var(--size-control-lg)] cursor-pointer',
        tones[tone],
      )}
    >
      {children}
    </button>
  )
}

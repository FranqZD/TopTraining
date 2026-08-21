import { Banana, Flame } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../ui'
import { api, localDay, EMPTY_VOTES, type FeedItem, type VoteKind, type VoteResult, type VoteTally } from '../../lib/api'

/** El voto es de a uno por día: el post que lo tenía antes lo pierde. */
export function applyVoteResult(items: FeedItem[], targetId: string, result: VoteResult): FeedItem[] {
  return items.map((item) => {
    if (item.id === targetId) return { ...item, votes: result.votes }
    if (result.movedFrom && item.id === result.movedFrom.checkInId) {
      const kind = result.movedFrom.kind
      const current = item.votes ?? EMPTY_VOTES
      return {
        ...item,
        votes: {
          ...current,
          [kind]: Math.max(0, current[kind] - 1),
          mine: current.mine.filter((mine) => mine !== kind),
        },
      }
    }
    return item
  })
}

/**
 * Aura (fuego) y Laura (plátano). Cada uno tiene uno de cada por día y solo
 * si entrenó: sin `canVote` los botones no responden.
 */
export function VoteBar({
  checkInId,
  votes,
  canVote,
  onVoted,
}: {
  checkInId: string
  votes: VoteTally
  canVote: boolean
  onVoted: (result: VoteResult) => void
}) {
  const tally = votes ?? EMPTY_VOTES
  const mine = new Set(tally.mine)

  const toggle = async (kind: VoteKind) => {
    try {
      const result = await api.post<VoteResult>(`/checkins/${checkInId}/votes`, {
        kind,
        day: localDay(),
      })
      onVoted(result)
    } catch {
      // Se vota poco y sin premio: si falla, el estado se queda como estaba.
    }
  }

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-sm)] bg-ink-800">
      <VoteCell
        label={canVote ? 'Aura' : 'Entrena hoy para dar aura'}
        active={mine.has('like')}
        canVote={canVote}
        tone="success"
        onClick={() => void toggle('like')}
      >
        <Flame size={16} strokeWidth={2.5} fill={mine.has('like') ? 'currentColor' : 'none'} />
      </VoteCell>

      <VoteCell
        label={canVote ? 'Laura' : 'Entrena hoy para dar laura'}
        active={mine.has('laura')}
        canVote={canVote}
        tone="danger"
        onClick={() => void toggle('laura')}
      >
        <Banana size={16} strokeWidth={2.5} fill={mine.has('laura') ? 'currentColor' : 'none'} />
      </VoteCell>
    </div>
  )
}

function VoteCell({
  label,
  active,
  canVote,
  tone,
  onClick,
  children,
}: {
  label: string
  active: boolean
  canVote: boolean
  tone: 'success' | 'danger'
  onClick: () => void
  children: ReactNode
}) {
  const tones = {
    success: active ? 'bg-success-tint text-success' : 'bg-ink-850 text-success/80',
    danger: active ? 'bg-danger-tint text-danger' : 'bg-ink-850 text-danger/80',
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      disabled={!canVote}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'pressable grid place-items-center h-9 cursor-pointer',
        tones[tone],
        !canVote && 'bg-ink-850 text-text-faint cursor-default',
      )}
    >
      {children}
    </button>
  )
}

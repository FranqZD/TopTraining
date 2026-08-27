import { Banana, Flame } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../ui'
import {
  api,
  localDay,
  EMPTY_VOTES,
  EMPTY_WALLET,
  type FeedItem,
  type VoteKind,
  type VoteResult,
  type VoteTally,
  type VoteWallet,
} from '../../lib/api'

/** Si el voto se movió de otro post, esa tarjeta pierde el conteo. */
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
          locked: (current.locked ?? []).filter((mine) => mine !== kind),
        },
      }
    }
    return item
  })
}

function canToggleKind(kind: VoteKind, votes: VoteTally, wallet: VoteWallet, canVote: boolean): boolean {
  const mine = new Set(votes.mine)
  const locked = new Set(votes.locked ?? [])
  const other: VoteKind = kind === 'like' ? 'laura' : 'like'
  if (mine.has(kind)) return !locked.has(kind)
  if (mine.has(other) && locked.has(other)) return false
  if (wallet.budget === 0) return canVote
  return wallet[kind] < wallet.budget
}

function kindLabel(kind: VoteKind, votes: VoteTally, wallet: VoteWallet, canVote: boolean): string {
  const name = kind === 'like' ? 'aura' : 'laura'
  const mine = new Set(votes.mine)
  const locked = new Set(votes.locked ?? [])
  const other: VoteKind = kind === 'like' ? 'laura' : 'like'
  if (mine.has(kind) && locked.has(kind)) return `Este ${name} ya se quedó`
  if (mine.has(other) && locked.has(other)) return 'Ese voto ya se quedó'
  if (wallet.budget === 0 && !canVote) return `Entrena para dar ${name}`
  if (!canToggleKind(kind, votes, wallet, canVote)) {
    return kind === 'like' ? 'No te quedan auras' : 'No te quedan lauras'
  }
  return kind === 'like' ? 'Aura' : 'Laura'
}

/**
 * Aura (fuego) y Laura (plátano). El cupo es un de cada por entreno. El mismo
 * día se puede sacar; al siguiente, se queda.
 */
export function VoteBar({
  checkInId,
  votes,
  wallet = EMPTY_WALLET,
  canVote,
  onVoted,
}: {
  checkInId: string
  votes: VoteTally
  wallet?: VoteWallet
  canVote: boolean
  onVoted: (result: VoteResult) => void
}) {
  const tally = votes ?? EMPTY_VOTES
  const mine = new Set(tally.mine)
  const purse = wallet ?? EMPTY_WALLET

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
        label={kindLabel('like', tally, purse, canVote)}
        active={mine.has('like')}
        enabled={canToggleKind('like', tally, purse, canVote)}
        tone="success"
        onClick={() => void toggle('like')}
      >
        <Flame size={16} strokeWidth={2.5} fill={mine.has('like') ? 'currentColor' : 'none'} />
      </VoteCell>

      <VoteCell
        label={kindLabel('laura', tally, purse, canVote)}
        active={mine.has('laura')}
        enabled={canToggleKind('laura', tally, purse, canVote)}
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
  enabled,
  tone,
  onClick,
  children,
}: {
  label: string
  active: boolean
  enabled: boolean
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
      disabled={!enabled}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'pressable grid place-items-center h-9',
        tones[tone],
        enabled ? 'cursor-pointer' : 'cursor-default',
        !enabled && !active && 'bg-ink-850 text-text-faint',
      )}
    >
      {children}
    </button>
  )
}

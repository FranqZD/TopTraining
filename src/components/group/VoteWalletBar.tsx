import { Banana, Flame } from 'lucide-react'
import type { VoteWallet } from '../../lib/api'

/**
 * Cuántas auras y lauras te quedan por dar. El cupo es un de cada por
 * cada entreno que marcaste.
 */
export function VoteWalletBar({ wallet }: { wallet?: VoteWallet }) {
  if (!wallet) return null

  const auras = Math.max(0, wallet.budget - wallet.like)
  const lauras = Math.max(0, wallet.budget - wallet.laura)

  if (wallet.budget === 0) {
    return (
      <p className="tape text-text-faint px-1">Entrena para ganar auras y lauras.</p>
    )
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] bg-surface border border-line-soft">
      <span className="tape text-text-faint">Te quedan</span>
      <span className="flex items-center gap-1.5 text-success min-w-0">
        <Flame size={16} strokeWidth={2.5} fill="currentColor" className="shrink-0" />
        <span className="num text-title leading-none">{auras}</span>
        <span className="tape text-success/70 truncate">{auras === 1 ? 'aura' : 'auras'}</span>
      </span>
      <span className="flex items-center gap-1.5 text-danger min-w-0">
        <Banana size={16} strokeWidth={2.5} fill="currentColor" className="shrink-0" />
        <span className="num text-title leading-none">{lauras}</span>
        <span className="tape text-danger/70 truncate">{lauras === 1 ? 'laura' : 'lauras'}</span>
      </span>
    </div>
  )
}

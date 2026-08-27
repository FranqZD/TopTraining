import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { FeedList } from './FeedList'
import { PostComposer } from './PostComposer'
import { api, localDay, type FeedPage, type VoteWallet } from '../../lib/api'
import { GROUP_TEXT_POSTS } from '../../lib/features'

/**
 * Feed del grupo: entrenos (y posts de texto si `GROUP_TEXT_POSTS`).
 * Tocar a alguien abre su feed personal.
 */
export function GroupFeed({
  groupId,
  isOwner = false,
  onWallet,
}: {
  groupId: string
  isOwner?: boolean
  onWallet?: (wallet?: VoteWallet) => void
}) {
  const navigate = useNavigate()
  const [epoch, setEpoch] = useState(0)

  const loadPage = useCallback(
    async (from: string | null) => {
      const query = new URLSearchParams({ limit: '25', today: localDay() })
      if (from) query.set('cursor', from)
      return api.get<FeedPage>(`/groups/${groupId}/feed?${query}`)
    },
    [groupId],
  )

  return (
    <div className="flex flex-col gap-5">
      {GROUP_TEXT_POSTS && (
        <PostComposer groupId={groupId} onPosted={() => setEpoch((n) => n + 1)} />
      )}
      <FeedList
        sourceKey={`${groupId}:${epoch}`}
        loadPage={loadPage}
        empty="Todavía no hay nada aquí."
        emptyHint={GROUP_TEXT_POSTS ? 'Marca un entreno o escribe un post.' : 'Marca un entreno y aparece acá.'}
        onAuthor={(userId) => navigate(`/u/${userId}`)}
        groupId={groupId}
        canModerate={isOwner}
        onWallet={onWallet}
      />
    </div>
  )
}

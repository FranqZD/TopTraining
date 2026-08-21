import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { FeedList } from './FeedList'
import { api, localDay, type FeedPage } from '../../lib/api'

/**
 * Feed del grupo: los check-ins de todos, del más nuevo al más viejo.
 * Tocar a alguien abre su feed personal.
 */
export function GroupFeed({ groupId }: { groupId: string }) {
  const navigate = useNavigate()

  const loadPage = useCallback(
    async (from: string | null) => {
      const query = new URLSearchParams({ limit: '25', today: localDay() })
      if (from) query.set('cursor', from)
      return api.get<FeedPage>(`/groups/${groupId}/feed?${query}`)
    },
    [groupId],
  )

  return (
    <FeedList
      sourceKey={groupId}
      loadPage={loadPage}
      empty="Todavía no ha entrenado nadie."
      emptyHint="Sé el primero y luego présumeles a todos."
      onAuthor={(userId) => navigate(`/u/${userId}`)}
    />
  )
}

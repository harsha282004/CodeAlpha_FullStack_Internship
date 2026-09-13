import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { useAsync } from '../../lib/hooks/useAsync'
import { getExplore } from '../../lib/api/feed'
import { useAuth } from '../../lib/auth/AuthContext'
import { Avatar } from '../ui/Avatar'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { FollowButton } from './FollowButton'
import type { PostAuthor } from '../../lib/api/types'

/**
 * Real data only: derives a small "people to discover" list from recent
 * public posts (/api/explore) rather than inventing a suggestions/trending
 * feature the backend doesn't have.
 */
export function DiscoverPeoplePanel() {
  const { user } = useAuth()
  const { data, isLoading } = useAsync(() => getExplore({ page: 1, limit: 20 }), [])

  const people = useMemo<PostAuthor[]>(() => {
    if (!data) return []
    const seen = new Set<string>()
    const result: PostAuthor[] = []
    for (const post of data.items) {
      if (post.author.id === user?.id || seen.has(post.author.id)) continue
      seen.add(post.author.id)
      result.push(post.author)
      if (result.length >= 5) break
    }
    return result
  }, [data, user?.id])

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground">Discover people</h2>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && people.length === 0 && <p className="text-sm text-muted-foreground">No one to discover just yet.</p>}

      {!isLoading && people.length > 0 && (
        <ul className="space-y-3">
          {people.map((author) => (
            <li key={author.id} className="flex items-center gap-2">
              <Link
                to="/profile/$username"
                params={{ username: author.username }}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <Avatar src={author.avatarUrl} name={author.name} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{author.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">@{author.username}</span>
                </span>
              </Link>
              <FollowButton username={author.username} size="sm" />
            </li>
          ))}
        </ul>
      )}

      <Link to="/explore" className="mt-3 block text-center text-sm font-medium text-primary hover:underline">
        See more
      </Link>
    </Card>
  )
}

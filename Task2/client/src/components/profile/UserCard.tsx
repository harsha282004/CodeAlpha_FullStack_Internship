import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Avatar } from '../ui/Avatar'
import type { PublicUser } from '../../lib/api/types'

interface UserCardProps {
  user: PublicUser
  trailing?: ReactNode
}

export function UserCard({ user, trailing }: UserCardProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 transition-colors hover:bg-muted/40 sm:px-6">
      <Link to="/profile/$username" params={{ username: user.username }} className="shrink-0">
        <Avatar src={user.avatarUrl} name={user.name} size="md" />
      </Link>
      <Link to="/profile/$username" params={{ username: user.username }} className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{user.name}</p>
        <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
        {user.bio && <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{user.bio}</p>}
      </Link>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  )
}

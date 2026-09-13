import { Link } from '@tanstack/react-router'
import { CalendarDays, Pencil } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import { FollowButton } from './FollowButton'
import { formatCount, formatJoinDate } from '../../lib/format'
import type { PublicUser } from '../../lib/api/types'

interface ProfileHeaderProps {
  profileUser: PublicUser
  isOwnProfile: boolean
  followerCount: number | null
  followingCount: number | null
}

export function ProfileHeader({ profileUser, isOwnProfile, followerCount, followingCount }: ProfileHeaderProps) {
  return (
    <div className="border-b border-border">
      <div className="h-28 bg-gradient-to-br from-primary/25 via-accent/15 to-transparent sm:h-36" />
      <div className="px-4 pb-5 sm:px-6">
        <div className="-mt-12 flex items-end justify-between sm:-mt-14">
          <Avatar src={profileUser.avatarUrl} name={profileUser.name} size="xl" className="ring-4 ring-background" />
          {isOwnProfile ? (
            <Link to="/settings">
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit profile
              </Button>
            </Link>
          ) : (
            <FollowButton username={profileUser.username} />
          )}
        </div>

        <div className="mt-3 space-y-0.5">
          <h1 className="text-xl font-bold text-foreground">{profileUser.name}</h1>
          <p className="text-sm text-muted-foreground">@{profileUser.username}</p>
        </div>

        {profileUser.bio && (
          <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-foreground">{profileUser.bio}</p>
        )}

        <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Joined {formatJoinDate(profileUser.createdAt)}
        </div>

        <div className="mt-3 flex gap-5 text-sm">
          <Link to="/following/$username" params={{ username: profileUser.username }} className="hover:underline">
            {followingCount === null ? (
              <Skeleton className="inline-block h-4 w-16 align-middle" />
            ) : (
              <>
                <span className="font-semibold text-foreground">{formatCount(followingCount)}</span>{' '}
                <span className="text-muted-foreground">Following</span>
              </>
            )}
          </Link>
          <Link to="/followers/$username" params={{ username: profileUser.username }} className="hover:underline">
            {followerCount === null ? (
              <Skeleton className="inline-block h-4 w-16 align-middle" />
            ) : (
              <>
                <span className="font-semibold text-foreground">{formatCount(followerCount)}</span>{' '}
                <span className="text-muted-foreground">Followers</span>
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  )
}

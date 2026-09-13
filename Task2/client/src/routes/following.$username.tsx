import { createFileRoute } from '@tanstack/react-router'
import { FollowListView } from '../components/profile/FollowListView'
import { listFollowing } from '../lib/api/follows'

export const Route = createFileRoute('/following/$username')({
  component: FollowingPage,
})

function FollowingPage() {
  const { username } = Route.useParams()
  return (
    <FollowListView
      username={username}
      title="Following"
      fetcher={listFollowing}
      emptyTitle="Not following anyone yet"
      emptyDescription={`When @${username} follows people, they'll show up here.`}
    />
  )
}

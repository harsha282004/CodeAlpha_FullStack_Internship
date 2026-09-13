import { createFileRoute } from '@tanstack/react-router'
import { FollowListView } from '../components/profile/FollowListView'
import { listFollowers } from '../lib/api/follows'

export const Route = createFileRoute('/followers/$username')({
  component: FollowersPage,
})

function FollowersPage() {
  const { username } = Route.useParams()
  return (
    <FollowListView
      username={username}
      title="Followers"
      fetcher={listFollowers}
      emptyTitle="No followers yet"
      emptyDescription={`When people follow @${username}, they'll show up here.`}
    />
  )
}

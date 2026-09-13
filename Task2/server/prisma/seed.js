import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Fixed, non-secret password used for every seeded dev account.
// Never logged as a hash, and only meaningful on a local development database.
const DEV_PASSWORD = 'Passw0rd!'
const SALT_ROUNDS = 10

// Deterministic ids keep every reseed idempotent: each record is upserted
// by a fixed key (email for users, id for posts/comments, composite unique
// constraints for likes/follows), so running this script repeatedly updates
// the same rows instead of creating duplicates.
const USERS = [
  {
    id: 'a0000000-0000-4000-8000-000000000001',
    name: 'Ava Walker',
    username: 'ava_walker',
    email: 'ava@connectly.dev',
    bio: 'Coffee, code, and cameras.',
    avatarUrl: 'https://picsum.photos/seed/ava-walker/200/200',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000002',
    name: 'Liam Chen',
    username: 'liam_chen',
    email: 'liam@connectly.dev',
    bio: 'Building things on weekends.',
    avatarUrl: 'https://picsum.photos/seed/liam-chen/200/200',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000003',
    name: 'Maya Patel',
    username: 'maya_patel',
    email: 'maya@connectly.dev',
    bio: 'Travel enthusiast and photographer.',
    avatarUrl: 'https://picsum.photos/seed/maya-patel/200/200',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000004',
    name: 'Noah Kim',
    username: 'noah_kim',
    email: 'noah@connectly.dev',
    bio: 'Indie game developer.',
    avatarUrl: 'https://picsum.photos/seed/noah-kim/200/200',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000005',
    name: 'Zoe Martinez',
    username: 'zoe_martinez',
    email: 'zoe@connectly.dev',
    bio: 'Runner. Reader. Recipe collector.',
    avatarUrl: 'https://picsum.photos/seed/zoe-martinez/200/200',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000006',
    name: 'Leo Johnson',
    username: 'leo_johnson',
    email: 'leo@connectly.dev',
    bio: null,
    avatarUrl: null,
  },
]

const U = Object.fromEntries(USERS.map((u) => [u.username, u.id]))

const POSTS = [
  { id: 'b0000000-0000-4000-8000-000000000001', authorId: U.ava_walker, content: 'Just deployed my first full-stack app!', imageUrl: 'https://picsum.photos/seed/post-1/600/400' },
  { id: 'b0000000-0000-4000-8000-000000000002', authorId: U.ava_walker, content: 'Morning coffee and a good book. Best combo.', imageUrl: null },
  { id: 'b0000000-0000-4000-8000-000000000003', authorId: U.liam_chen, content: 'Refactored 500 lines down to 50 today. Feels good.', imageUrl: null },
  { id: 'b0000000-0000-4000-8000-000000000004', authorId: U.liam_chen, content: 'Weekend project: building a mechanical keyboard.', imageUrl: 'https://picsum.photos/seed/post-4/600/400' },
  { id: 'b0000000-0000-4000-8000-000000000005', authorId: U.maya_patel, content: 'Sunset over the mountains tonight.', imageUrl: 'https://picsum.photos/seed/post-5/600/400' },
  { id: 'b0000000-0000-4000-8000-000000000006', authorId: U.maya_patel, content: "Packing for next week's trip. Any city recommendations?", imageUrl: null },
  { id: 'b0000000-0000-4000-8000-000000000007', authorId: U.noah_kim, content: 'New devlog is up — pathfinding finally works!', imageUrl: null },
  { id: 'b0000000-0000-4000-8000-000000000008', authorId: U.noah_kim, content: 'Pixel art is harder than it looks.', imageUrl: 'https://picsum.photos/seed/post-8/600/400' },
  { id: 'b0000000-0000-4000-8000-000000000009', authorId: U.zoe_martinez, content: 'Ran my first 10k this morning.', imageUrl: 'https://picsum.photos/seed/post-9/600/400' },
  { id: 'b0000000-0000-4000-8000-000000000010', authorId: U.zoe_martinez, content: 'Tried a new pasta recipe tonight, huge success.', imageUrl: null },
  { id: 'b0000000-0000-4000-8000-000000000011', authorId: U.leo_johnson, content: 'Hello, Connectly!', imageUrl: null },
  { id: 'b0000000-0000-4000-8000-000000000012', authorId: U.leo_johnson, content: 'Still figuring out this whole social media thing.', imageUrl: null },
]

const P = Object.fromEntries(POSTS.map((p, i) => [`p${i + 1}`, p.id]))

const COMMENTS = [
  { id: 'c0000000-0000-4000-8000-000000000001', postId: P.p1, authorId: U.liam_chen, content: 'Congrats! What stack did you use?' },
  { id: 'c0000000-0000-4000-8000-000000000002', postId: P.p1, authorId: U.maya_patel, content: 'This is awesome, well done!' },
  { id: 'c0000000-0000-4000-8000-000000000003', postId: P.p1, authorId: U.ava_walker, content: 'Thanks everyone!' },
  { id: 'c0000000-0000-4000-8000-000000000004', postId: P.p4, authorId: U.noah_kim, content: 'Show us photos of the build!' },
  { id: 'c0000000-0000-4000-8000-000000000005', postId: P.p4, authorId: U.zoe_martinez, content: 'Mechanical keyboards are addictive.' },
  { id: 'c0000000-0000-4000-8000-000000000006', postId: P.p5, authorId: U.leo_johnson, content: 'Wow, gorgeous!' },
  { id: 'c0000000-0000-4000-8000-000000000007', postId: P.p5, authorId: U.ava_walker, content: 'Where was this taken?' },
  { id: 'c0000000-0000-4000-8000-000000000008', postId: P.p7, authorId: U.liam_chen, content: 'Pathfinding bugs are the worst. Glad it works now.' },
  { id: 'c0000000-0000-4000-8000-000000000009', postId: P.p8, authorId: U.maya_patel, content: 'The style is really charming.' },
  { id: 'c0000000-0000-4000-8000-000000000010', postId: P.p9, authorId: U.noah_kim, content: 'Nice! What was your time?' },
  { id: 'c0000000-0000-4000-8000-000000000011', postId: P.p9, authorId: U.leo_johnson, content: 'Inspiring, might start running too.' },
  { id: 'c0000000-0000-4000-8000-000000000012', postId: P.p10, authorId: U.ava_walker, content: 'Recipe please!' },
  { id: 'c0000000-0000-4000-8000-000000000013', postId: P.p2, authorId: U.zoe_martinez, content: 'Reading anything good lately?' },
  { id: 'c0000000-0000-4000-8000-000000000014', postId: P.p11, authorId: U.maya_patel, content: 'Welcome!' },
  { id: 'c0000000-0000-4000-8000-000000000015', postId: P.p12, authorId: U.liam_chen, content: "You'll get the hang of it." },
]

const LIKES = [
  { userId: U.liam_chen, postId: P.p1 },
  { userId: U.maya_patel, postId: P.p1 },
  { userId: U.zoe_martinez, postId: P.p1 },
  { userId: U.liam_chen, postId: P.p4 },
  { userId: U.noah_kim, postId: P.p4 },
  { userId: U.ava_walker, postId: P.p5 },
  { userId: U.leo_johnson, postId: P.p5 },
  { userId: U.zoe_martinez, postId: P.p5 },
  { userId: U.liam_chen, postId: P.p7 },
  { userId: U.maya_patel, postId: P.p8 },
  { userId: U.ava_walker, postId: P.p9 },
  { userId: U.noah_kim, postId: P.p9 },
  { userId: U.leo_johnson, postId: P.p9 },
  { userId: U.zoe_martinez, postId: P.p10 },
  { userId: U.maya_patel, postId: P.p11 },
]

const FOLLOWS = [
  { followerId: U.ava_walker, followingId: U.liam_chen },
  { followerId: U.ava_walker, followingId: U.maya_patel },
  { followerId: U.liam_chen, followingId: U.ava_walker },
  { followerId: U.liam_chen, followingId: U.noah_kim },
  { followerId: U.maya_patel, followingId: U.ava_walker },
  { followerId: U.maya_patel, followingId: U.zoe_martinez },
  { followerId: U.noah_kim, followingId: U.liam_chen },
  { followerId: U.noah_kim, followingId: U.leo_johnson },
  { followerId: U.zoe_martinez, followingId: U.maya_patel },
  { followerId: U.zoe_martinez, followingId: U.ava_walker },
  { followerId: U.leo_johnson, followingId: U.ava_walker },
  { followerId: U.leo_johnson, followingId: U.noah_kim },
]

async function seedUsers(passwordHash) {
  for (const user of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash },
    })
  }
}

async function seedPosts() {
  for (const post of POSTS) {
    await prisma.post.upsert({
      where: { id: post.id },
      update: {},
      create: post,
    })
  }
}

async function seedComments() {
  for (const comment of COMMENTS) {
    await prisma.comment.upsert({
      where: { id: comment.id },
      update: {},
      create: comment,
    })
  }
}

async function seedLikes() {
  for (const like of LIKES) {
    await prisma.like.upsert({
      where: { userId_postId: { userId: like.userId, postId: like.postId } },
      update: {},
      create: like,
    })
  }
}

async function seedFollows() {
  for (const follow of FOLLOWS) {
    if (follow.followerId === follow.followingId) {
      // Defense in depth: the seed data above never does this, but a user
      // can never be allowed to follow themselves.
      throw new Error(`Refusing to seed a self-follow for user ${follow.followerId}`)
    }

    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: follow.followerId,
          followingId: follow.followingId,
        },
      },
      update: {},
      create: follow,
    })
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, SALT_ROUNDS)

  await seedUsers(passwordHash)
  await seedPosts()
  await seedComments()
  await seedLikes()
  await seedFollows()

  console.log(
    `Seeded ${USERS.length} users, ${POSTS.length} posts, ${COMMENTS.length} comments, ${LIKES.length} likes, ${FOLLOWS.length} follows.`,
  )
  console.log(`All seeded users share the dev-only password: ${DEV_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

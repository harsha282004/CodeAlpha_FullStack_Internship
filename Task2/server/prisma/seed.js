import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Fixed, non-secret password used for every seeded dev account.
// Never logged as a hash, and only meaningful on a local development database.
const DEV_PASSWORD = 'Passw0rd!'
const SALT_ROUNDS = 10

function makeId(prefix, n) {
  return `${prefix}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

// ---------------------------------------------------------------------------
// Users
//
// The original 6 accounts (ids ...0001-...0006) are preserved exactly as they
// were — same ids, usernames, emails, bios, avatars — so existing local
// database rows, tokens, and documentation referencing them keep working.
// 30 additional accounts extend the roster to a more realistic ~36 users.
// ---------------------------------------------------------------------------
const EXISTING_USERS = [
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

const NEW_USERS = [
  ['priya_sharma', 'Priya Sharma', 'Full-stack developer. Open source contributor on weekends.'],
  ['ethan_brooks', 'Ethan Brooks', 'UX designer who sweats the small details.'],
  ['grace_lin', 'Grace Lin', 'CS senior. Into distributed systems and databases.'],
  ['marcus_webb', 'Marcus Webb', 'Street photographer. Always have a camera on me.'],
  ['sofia_rossi', 'Sofia Rossi', 'Backpacking through as many countries as I can afford.'],
  ['derek_osei', 'Derek Osei', '5am gym sessions. Powerlifting nerd.'],
  ['hannah_whitfield', 'Hannah Whitfield', 'Illustrator and comic artist. Currently drawing a lot of robots.'],
  ['victor_alvarez', 'Victor Alvarez', 'Building my second startup. Happy to talk shop.'],
  ['aiko_tanaka', 'Aiko Tanaka', 'Home cook obsessed with ramen broth.'],
  ['ryan_cole', 'Ryan Cole', 'Speedrunner. Currently deep into roguelikes.'],
  ['fatima_haddad', 'Fatima Haddad', 'PhD candidate researching climate models.'],
  ['owen_fitzgerald', 'Owen Fitzgerald', 'Writing a novel one paragraph at a time.'],
  ['chloe_bennett', 'Chloe Bennett', 'Frontend engineer obsessed with clean interfaces.'],
  ['daniel_park', 'Daniel Park', 'Product designer. Coffee snob.'],
  ['isabella_cruz', 'Isabella Cruz', 'Junior studying computer engineering.'],
  ['mateo_silva', 'Mateo Silva', 'Landscape photographer chasing golden hour.'],
  ['nora_kristiansen', 'Nora Kristiansen', 'Digital nomad. Currently based in Lisbon.'],
  ['jamal_carter', 'Jamal Carter', 'Marathon training log, mile by mile.'],
  ['ling_zhou', 'Ling Zhou', 'Ceramicist. Weekend potter.'],
  ['olivia_reyes', 'Olivia Reyes', 'Bootstrapped my SaaS to profitability last year.'],
  ['kenji_watanabe', 'Kenji Watanabe', 'Home baker. Sourdough obsessive.'],
  ['zara_ahmed', 'Zara Ahmed', 'Streamer, mostly strategy games.'],
  ['thomas_reed', 'Thomas Reed', 'Postdoc in machine learning, NLP focus.'],
  ['emily_osborne', 'Emily Osborne', 'Poetry and short fiction. Coffee shop dweller.'],
  ['aditya_rao', 'Aditya Rao', 'Backend engineer. Distributed systems and databases.'],
  ['lucas_ferreira', 'Lucas Ferreira', 'Product designer exploring motion design.'],
  ['mia_thompson', 'Mia Thompson', 'Sophomore. Into the robotics club.'],
  ['sana_malik', 'Sana Malik', 'Portrait photographer. Natural light only.'],
  ['felix_grant', 'Felix Grant', 'Road-tripping across the coast this summer.'],
  ['amara_nwosu', 'Amara Nwosu', 'CrossFit coach and nutrition nerd.'],
].map(([username, name, bio], i) => ({
  id: makeId('a', i + 7),
  name,
  username,
  email: `${username.replace(/_/g, '.')}@connectly.dev`,
  bio,
  avatarUrl: `https://picsum.photos/seed/${username.replace(/_/g, '-')}/200/200`,
}))

const USERS = [...EXISTING_USERS, ...NEW_USERS]
const U = Object.fromEntries(USERS.map((u) => [u.username, u.id]))

// ---------------------------------------------------------------------------
// Posts
//
// The original 12 posts (ids ...0001-...0012) are preserved exactly. 129 new
// posts extend the dataset to ~141 posts spread across every user, with a
// realistic mix of text-only and image posts.
// ---------------------------------------------------------------------------
const EXISTING_POSTS = [
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

// [content, imageSlug|null], grouped by theme purely for readability below.
const POST_CONTENT_POOL = [
  // Tech / programming
  ['Finally shipped the feature I’ve been working on all week.', 'tech-1'],
  ['Spent the afternoon cleaning up an old React component. Amazing how much easier everything becomes when the state boundaries are clear.', null],
  ['Started a small side project this weekend to experiment with recommendation systems. It’s nowhere near production-ready, but watching the first results appear was surprisingly satisfying.', null],
  ['TypeScript strict mode caught three bugs before they ever hit prod today.', 'tech-2'],
  ['Rewrote our build pipeline from webpack to Vite. Cold start went from 40s to 2s.', 'tech-3'],
  ['Debugging a race condition for four hours only to find a missing await. Classic.', null],
  ['Pushed my first open source PR today. Small change, but it felt great.', null],
  ['Anyone have opinions on Postgres vs. Mongo for a project with a lot of relational data? Leaning Postgres.', null],
  ['Code review culture on this team is genuinely great. Learned three new patterns this week just from comments.', null],
  ['Wrote a script to automate the thing I do manually every Monday. Past me is furious it took this long.', 'tech-4'],
  ['Deployed to production on a Friday. Living dangerously.', null],
  ['Finally understand closures well enough to explain them to someone else. Feels like a milestone.', null],
  ['GitHub Copilot suggested the exact function I was about to write. Slightly unsettling, mostly helpful.', 'tech-5'],
  ['Refactored the auth flow to use middleware properly instead of checking permissions in every controller.', null],
  ['Three hours into a “quick” migration script. Send help.', null],
  ['My side project finally has more than zero users. Both of them seem happy so far.', 'tech-6'],
  ['There’s something deeply satisfying about a green CI pipeline after a red one.', null],
  ['Learning Rust this month. My brain hurts in a good way.', null],
  ['Container orchestration is either magic or a nightmare depending on the day.', 'tech-7'],
  ['Wrote my first integration test suite from scratch today. Coverage went from 12% to 68%.', 'tech-8'],
  ['Hackathon project actually works end to end. Did not expect that.', null],
  ['Spent way too long picking a font for a developer tool nobody but me will use.', 'tech-9'],
  ['The bug was a typo. It’s always a typo.', null],
  ['Set up CI/CD for a personal project today. Overkill, but it was fun to build.', 'tech-10'],

  // Travel
  ['Six months of saving finally paid off — the trip is booked.', 'travel-1'],
  ['Landed somewhere new with zero plans. My favorite way to travel.', 'travel-2'],
  ['Three flights, two layovers, one very tired traveler. Worth it for this view.', 'travel-3'],
  ['Found a tiny café down a side street that had the best espresso of the whole trip.', 'travel-4'],
  ['The train ride through the mountains was better than any destination could have been.', 'travel-5'],
  ['Six months into working remotely from a different city each month. Still not tired of it.', null],
  ['Got lost in the old town for two hours and somehow it was the best part of the day.', 'travel-6'],
  ['Booked a one-way ticket. Figuring the rest out as I go.', null],
  ['Road trip playlist is locked in. Now we just need actual roads.', 'travel-7'],
  ['This city has completely changed how I think about public transit.', 'travel-8'],
  ['Watched the sunrise from the airport window seat. Not a bad way to start a Monday.', 'travel-9'],
  ['Local market > every souvenir shop combined.', 'travel-10'],
  ['Six countries in, and the best meal so far was from a stand with no sign.', null],
  ['Currency conversion math still gets me every single time.', null],
  ['Packing light finally clicked for me. One bag, three weeks, zero regrets.', 'travel-11'],
  ['Somewhere between jet lag and wonder right now.', 'travel-12'],

  // Photography
  ['Caught the last bit of light over the ridge tonight.', 'photo-1'],
  ['Spent the evening chasing light on a street I’ve walked a hundred times.', 'photo-2'],
  ['Finally got the portrait lighting right after a dozen failed attempts.', 'photo-3'],
  ['There’s a building downtown that photographs completely differently depending on the hour.', 'photo-4'],
  ['Shot on film for the first time in years. Forgot how much patience it takes.', null],
  ['The best shots today weren’t the ones I planned for.', 'photo-5'],
  ['Golden hour lasted about four minutes tonight and I got exactly one usable frame.', 'photo-6'],
  ['Street photography is 90% waiting and 10% luck.', null],
  ['Editing a batch from the weekend. Trying not to over-process everything like I used to.', null],
  ['This lens was worth every bit of the wait to save up for it.', 'photo-7'],
  ['Fog rolled in right as I set up the tripod. Couldn’t have timed it better.', 'photo-8'],
  ['Portraits of strangers who agreed to five minutes and a coffee in exchange.', 'photo-9'],
  ['Architecture shoot today reminded me how much I love symmetry.', 'photo-10'],
  ['Nothing beats the first look through a new camera body.', null],
  ['Long exposure of the harbor tonight. Twenty seconds felt like forever holding still.', 'photo-11'],
  ['Some days the light does all the work for you.', 'photo-12'],

  // Fitness
  ['Longest run yet this morning. Legs are done, but I’m not complaining.', 'fitness-1'],
  ['New personal best on deadlift today. Small numbers, big feeling.', 'fitness-2'],
  ['Recovery day. My legs have filed a formal complaint.', null],
  ['Signed up for a half marathon. Past me made a decision future me now has to train for.', null],
  ['Morning lifts hit different when the gym is empty.', 'fitness-3'],
  ['Six weeks into a new program and finally seeing the difference in the mirror, not just the numbers.', 'fitness-4'],
  ['Cold plunge after the workout was somehow the hardest part of the day.', 'fitness-5'],
  ['Missed three days and could genuinely feel it. Back at it today.', null],
  ['Ran without music for the first time in ages. Turns out my own thoughts are decent company.', null],
  ['PR on the bench today after months of plateauing. Patience actually paid off.', 'fitness-6'],
  ['Trained outdoors today instead of the gym. Forgot how much better fresh air makes everything feel.', 'fitness-7'],
  ['Rest days used to feel like giving up. Now they just feel like part of the plan.', null],
  ['Hill sprints this morning. Regretting every choice that led to this.', 'fitness-8'],
  ['Hit a new mile time today and didn’t even realize until I checked my watch afterward.', 'fitness-9'],

  // Food
  ['Tried a new stir-fry recipe tonight. Went better than the last three attempts combined.', 'food-1'],
  ['Spent the whole afternoon on a sourdough starter that’s finally coming to life.', 'food-2'],
  ['Found a hole-in-the-wall noodle shop that’s now officially my favorite restaurant in the city.', 'food-3'],
  ['Coffee experiment of the day: cold brew with a splash of oat milk and cinnamon. Surprisingly great.', 'food-4'],
  ['Cooked for six people tonight and only slightly underestimated the portions.', null],
  ['This is the third time I’ve tried to make ramen broth from scratch. Finally got it right.', 'food-5'],
  ['Farmers market haul today was better than any grocery run this month.', 'food-6'],
  ['Burnt the garlic and had to start the whole dish over. Kitchen humility.', null],
  ['Made my grandmother’s recipe from memory tonight. Close, but not quite there yet.', 'food-7'],
  ['New espresso machine arrived today. My bank account regrets it, my mornings do not.', 'food-8'],
  ['Meal prepped for the whole week in one afternoon. Future me says thank you.', null],
  ['Tried making pizza dough from scratch. Shape looked more like a continent than a circle.', 'food-9'],
  ['Discovered a spice blend that’s now going in everything I cook.', null],
  ['Breakfast tacos for dinner. No regrets.', 'food-10'],

  // Student / college
  ['Somehow it’s already week ten of the semester.', null],
  ['Finals week survival mode: coffee, flashcards, repeat.', 'student-1'],
  ['Group project update: we have a shared doc and mild chaos.', null],
  ['Just submitted my thesis proposal. Somehow both relieved and terrified.', null],
  ['Hackathon weekend starts now. Team of four, one idea, thirty-six hours.', 'student-2'],
  ['Internship offer came through today. Still processing it.', null],
  ['Office hours saved me on this assignment. Should go more often, honestly.', null],
  ['Study group turned into three hours of productive tangents. Still counts, right?', null],
  ['Registered for next semester’s classes. Schedule looks either ambitious or unhinged.', null],
  ['Presented my capstone project today. Nerve-wracking, but it went well.', 'student-3'],
  ['Campus library at midnight has a very specific kind of energy.', 'student-4'],
  ['Got my exam grade back. Better than expected, worse than hoped.', null],
  ['First week of the new internship. Learned more in five days than a month of lectures.', null],
  ['Pulled an all-nighter for the project demo. It actually worked. Somehow.', 'student-5'],
  ['Career fair today. Business cards, small talk, and one promising conversation.', null],

  // Lifestyle
  ['Picked up a new book based purely on the cover. No regrets so far.', null],
  ['Finished a book in one sitting for the first time in months. Forgot that feeling.', null],
  ['Rearranged my whole apartment today for no reason other than needing a change.', 'lifestyle-1'],
  ['Tried a new productivity system. Give it a week before I inevitably abandon it.', null],
  ['Spent the whole weekend doing absolutely nothing productive and it was exactly what I needed.', null],
  ['New playlist for the commute. Currently on repeat.', null],
  ['Started journaling again after a long break. Cheaper than therapy, not a replacement for it.', null],
  ['Sunday reset: laundry, groceries, meal prep, and one long walk.', 'lifestyle-2'],
  ['Finally organized the bookshelf by color instead of alphabetically. No regrets.', 'lifestyle-3'],
  ['Digital declutter weekend. Unsubscribed from more newsletters than I expected.', null],
  ['Tried a no-phone morning routine. Made it forty minutes before checking messages.', null],
  ['Bought a plant I definitely don’t know how to keep alive. Wish us luck.', 'lifestyle-4'],
  ['Rewatched an old favorite movie tonight. Held up better than I remembered.', null],
  ['Slow Sunday with good coffee and no plans. Underrated combination.', 'lifestyle-5'],
  ['Started learning guitar again after years of a dusty case in the closet.', 'lifestyle-6'],

  // Creative
  ['Kicking off a new sketchbook today. Blank pages are somehow intimidating.', 'creative-1'],
  ['New sketch dump from this week’s notebook.', 'creative-2'],
  ['Finally finished the illustration I’ve been picking at for a month.', 'creative-3'],
  ['Side project: designing a font from scratch. Slower than expected, more fun than expected too.', null],
  ['Wrote 2,000 words tonight. Half of them will probably get cut, and that’s fine.', null],
  ['Working on a comic strip idea that’s been stuck in my head for weeks.', 'creative-4'],
  ['Redesigned my portfolio site for the third time this year. This one’s sticking, I promise.', 'creative-5'],
  ['Tried a new painting technique today. Messier than planned, better than expected.', 'creative-6'],
  ['Finished the first draft of a short story I’ve been avoiding for months.', null],
  ['Prototype for a small game jam entry is starting to actually look like a game.', 'creative-7'],
  ['Spent the evening building a tiny synth patch just to hear what it sounds like.', null],
  ['New pottery piece came out of the kiln today. Not perfect, but I like the imperfections.', 'creative-8'],
  ['Storyboarded an entire short film idea on napkins today. Very professional process.', null],
  ['Finally learned the animation technique I’ve been putting off for a year.', null],
  ['Design critique today was brutal but genuinely made the work better.', null],
]

// How many *new* posts each user gets, on top of any posts they already have.
// Sums to exactly POST_CONTENT_POOL.length so every piece of content is used
// once. Values stay within the requested 1-8 posts/user spread.
const AUTHOR_NEW_POST_COUNTS = {
  ava_walker: 7, maya_patel: 7, victor_alvarez: 8, priya_sharma: 7, marcus_webb: 6, chloe_bennett: 6,
  liam_chen: 5, zoe_martinez: 5, noah_kim: 3, sofia_rossi: 3, derek_osei: 4, hannah_whitfield: 3,
  aiko_tanaka: 3, ryan_cole: 3, owen_fitzgerald: 3, daniel_park: 3, mateo_silva: 4, nora_kristiansen: 3,
  jamal_carter: 3, olivia_reyes: 4, kenji_watanabe: 3, zara_ahmed: 3, emily_osborne: 3, aditya_rao: 4,
  sana_malik: 3, amara_nwosu: 3, leo_johnson: 2, ethan_brooks: 2, grace_lin: 2, fatima_haddad: 2,
  isabella_cruz: 2, ling_zhou: 2, thomas_reed: 2, lucas_ferreira: 2, mia_thompson: 2, felix_grant: 2,
}

// Round-robins through the author plan so one author's posts aren't bunched
// together, which keeps the later timestamp spread realistic per author.
function buildAuthorSequence(counts) {
  const remaining = { ...counts }
  const order = Object.keys(counts)
  const sequence = []
  let progress = true
  while (progress) {
    progress = false
    for (const username of order) {
      if (remaining[username] > 0) {
        sequence.push(username)
        remaining[username] -= 1
        progress = true
      }
    }
  }
  return sequence
}

const AUTHOR_SEQUENCE = buildAuthorSequence(AUTHOR_NEW_POST_COUNTS)

const NEW_POSTS = POST_CONTENT_POOL.map(([content, imageSlug], idx) => ({
  id: makeId('b', idx + 13),
  authorId: U[AUTHOR_SEQUENCE[idx]],
  content,
  imageUrl: imageSlug ? `https://picsum.photos/seed/${imageSlug}/600/400` : null,
}))

const ALL_POSTS = [...EXISTING_POSTS, ...NEW_POSTS]

// Spreads createdAt across the last ~3 weeks, newest last, with more posts
// clustered near "now" than at the far edge — never in the future.
const MAX_POST_AGE_MINUTES = 21 * 24 * 60
function postCreatedAt(index, total) {
  const fraction = total > 1 ? index / (total - 1) : 1
  const ageMinutes = Math.round(MAX_POST_AGE_MINUTES * (1 - fraction) ** 1.4)
  return new Date(Date.now() - ageMinutes * 60 * 1000)
}

const POSTS = ALL_POSTS.map((post, idx) => ({
  ...post,
  createdAt: postCreatedAt(idx, ALL_POSTS.length),
}))

const P = Object.fromEntries(POSTS.map((p) => [p.id, p]))

// ---------------------------------------------------------------------------
// Comments — the original 15 (ids ...0001-...0015) are preserved exactly.
// Additional comments are generated deterministically across all posts.
// ---------------------------------------------------------------------------
const EXISTING_COMMENTS = [
  { id: 'c0000000-0000-4000-8000-000000000001', postId: 'b0000000-0000-4000-8000-000000000001', authorId: U.liam_chen, content: 'Congrats! What stack did you use?' },
  { id: 'c0000000-0000-4000-8000-000000000002', postId: 'b0000000-0000-4000-8000-000000000001', authorId: U.maya_patel, content: 'This is awesome, well done!' },
  { id: 'c0000000-0000-4000-8000-000000000003', postId: 'b0000000-0000-4000-8000-000000000001', authorId: U.ava_walker, content: 'Thanks everyone!' },
  { id: 'c0000000-0000-4000-8000-000000000004', postId: 'b0000000-0000-4000-8000-000000000004', authorId: U.noah_kim, content: 'Show us photos of the build!' },
  { id: 'c0000000-0000-4000-8000-000000000005', postId: 'b0000000-0000-4000-8000-000000000004', authorId: U.zoe_martinez, content: 'Mechanical keyboards are addictive.' },
  { id: 'c0000000-0000-4000-8000-000000000006', postId: 'b0000000-0000-4000-8000-000000000005', authorId: U.leo_johnson, content: 'Wow, gorgeous!' },
  { id: 'c0000000-0000-4000-8000-000000000007', postId: 'b0000000-0000-4000-8000-000000000005', authorId: U.ava_walker, content: 'Where was this taken?' },
  { id: 'c0000000-0000-4000-8000-000000000008', postId: 'b0000000-0000-4000-8000-000000000007', authorId: U.liam_chen, content: 'Pathfinding bugs are the worst. Glad it works now.' },
  { id: 'c0000000-0000-4000-8000-000000000009', postId: 'b0000000-0000-4000-8000-000000000008', authorId: U.maya_patel, content: 'The style is really charming.' },
  { id: 'c0000000-0000-4000-8000-000000000010', postId: 'b0000000-0000-4000-8000-000000000009', authorId: U.noah_kim, content: 'Nice! What was your time?' },
  { id: 'c0000000-0000-4000-8000-000000000011', postId: 'b0000000-0000-4000-8000-000000000009', authorId: U.leo_johnson, content: 'Inspiring, might start running too.' },
  { id: 'c0000000-0000-4000-8000-000000000012', postId: 'b0000000-0000-4000-8000-000000000010', authorId: U.ava_walker, content: 'Recipe please!' },
  { id: 'c0000000-0000-4000-8000-000000000013', postId: 'b0000000-0000-4000-8000-000000000002', authorId: U.zoe_martinez, content: 'Reading anything good lately?' },
  { id: 'c0000000-0000-4000-8000-000000000014', postId: 'b0000000-0000-4000-8000-000000000011', authorId: U.maya_patel, content: 'Welcome!' },
  { id: 'c0000000-0000-4000-8000-000000000015', postId: 'b0000000-0000-4000-8000-000000000012', authorId: U.liam_chen, content: "You'll get the hang of it." },
]

const COMMENT_TEMPLATES = [
  "That's a really clean approach.", 'Love this!', 'I ran into the same issue last week.', 'This looks amazing.',
  'Which library did you use?', 'That view is incredible.', 'Congrats on shipping it!', 'Would love to see the next version.',
  "This is so relatable.", 'Saving this for later.', 'How long did this take you?', 'The composition here is great.',
  'Needed to see this today.', 'This made my morning.', 'Following along, keep going.', 'The colors in this are perfect.',
  "I've been meaning to try this.", 'This is exactly what I needed to read.', 'Well deserved, congrats.', "What's your setup for this?",
  'This is such a mood.', 'The details here are incredible.', "Can't believe how good this turned out.", 'This inspired me to start my own.',
  'Bookmarking this for reference.', "That's impressive progress.", 'Where was this taken?', 'This is underrated, more people need to see it.',
  'The lighting in this shot is perfect.', 'I felt this in my bones.', 'This deserves way more attention.', 'Take my like, this is great.',
  'Been there. Rough but worth it.', 'This is genuinely well written.', 'You make this look easy.', 'Adding this to my list immediately.',
  'The energy in this post is great.', 'I need the recipe, please.', 'This is the content I signed up for.', 'Such a good reminder.',
  'How did you get into this?', 'This came out so well.', 'The patience this must have taken.', 'Big fan of this direction.',
  'This is a great before and after.', 'Sending this to a friend who needs it.', 'The details really make this one.', 'This is why I love this app.',
  'Solid work, as always.', "Can't wait to see where this goes.",
]

// Some posts get no comments, some get several — a fixed cycling pattern
// keeps the distribution varied but fully deterministic across reseeds.
const COMMENT_COUNT_PATTERN = [0, 1, 0, 2, 1, 3, 0, 1, 2, 0, 1, 5, 0, 2, 1, 0, 3, 1, 0, 2]
const LIKE_COUNT_PATTERN = [0, 2, 5, 1, 3, 0, 8, 2, 1, 4, 0, 12, 3, 1, 2, 6, 0, 1, 4, 2]

// Deterministically picks `count` distinct users, skipping anyone in
// `excludeIds` and anyone `isTaken` rejects (used to dedupe against
// already-existing likes/follows). The step (7) is coprime with the user
// count so repeated calls cycle through everyone before repeating.
function pickUsers(count, seed, excludeIds, isTaken) {
  const picked = []
  let cursor = seed % USERS.length
  let attempts = 0
  while (picked.length < count && attempts < USERS.length * 3) {
    const candidate = USERS[cursor % USERS.length]
    cursor += 7
    attempts += 1
    if (excludeIds.includes(candidate.id)) continue
    if (picked.includes(candidate.id)) continue
    if (isTaken && isTaken(candidate.id)) continue
    picked.push(candidate.id)
  }
  return picked
}

let commentCounter = EXISTING_COMMENTS.length
const GENERATED_COMMENTS = []
POSTS.forEach((post, i) => {
  const count = COMMENT_COUNT_PATTERN[i % COMMENT_COUNT_PATTERN.length]
  const commenters = pickUsers(count, i * 11 + 5, [post.authorId])
  commenters.forEach((authorId, slot) => {
    commentCounter += 1
    GENERATED_COMMENTS.push({
      id: makeId('c', commentCounter),
      postId: post.id,
      authorId,
      content: COMMENT_TEMPLATES[(i * 3 + slot * 11) % COMMENT_TEMPLATES.length],
    })
  })
})

const COMMENTS = [...EXISTING_COMMENTS, ...GENERATED_COMMENTS]

// ---------------------------------------------------------------------------
// Likes — the original 15 pairs are preserved exactly. Additional likes are
// generated per post, skipping anyone who already likes that post.
// ---------------------------------------------------------------------------
const EXISTING_LIKES = [
  { userId: U.liam_chen, postId: 'b0000000-0000-4000-8000-000000000001' },
  { userId: U.maya_patel, postId: 'b0000000-0000-4000-8000-000000000001' },
  { userId: U.zoe_martinez, postId: 'b0000000-0000-4000-8000-000000000001' },
  { userId: U.liam_chen, postId: 'b0000000-0000-4000-8000-000000000004' },
  { userId: U.noah_kim, postId: 'b0000000-0000-4000-8000-000000000004' },
  { userId: U.ava_walker, postId: 'b0000000-0000-4000-8000-000000000005' },
  { userId: U.leo_johnson, postId: 'b0000000-0000-4000-8000-000000000005' },
  { userId: U.zoe_martinez, postId: 'b0000000-0000-4000-8000-000000000005' },
  { userId: U.liam_chen, postId: 'b0000000-0000-4000-8000-000000000007' },
  { userId: U.maya_patel, postId: 'b0000000-0000-4000-8000-000000000008' },
  { userId: U.ava_walker, postId: 'b0000000-0000-4000-8000-000000000009' },
  { userId: U.noah_kim, postId: 'b0000000-0000-4000-8000-000000000009' },
  { userId: U.leo_johnson, postId: 'b0000000-0000-4000-8000-000000000009' },
  { userId: U.zoe_martinez, postId: 'b0000000-0000-4000-8000-000000000010' },
  { userId: U.maya_patel, postId: 'b0000000-0000-4000-8000-000000000011' },
]

const likeKey = (userId, postId) => `${userId}|${postId}`
const takenLikeKeys = new Set(EXISTING_LIKES.map((l) => likeKey(l.userId, l.postId)))

const GENERATED_LIKES = []
POSTS.forEach((post, i) => {
  const count = LIKE_COUNT_PATTERN[i % LIKE_COUNT_PATTERN.length]
  const likers = pickUsers(count, i * 5 + 3, [post.authorId], (uid) => takenLikeKeys.has(likeKey(uid, post.id)))
  likers.forEach((userId) => {
    takenLikeKeys.add(likeKey(userId, post.id))
    GENERATED_LIKES.push({ userId, postId: post.id })
  })
})

const LIKES = [...EXISTING_LIKES, ...GENERATED_LIKES]

// ---------------------------------------------------------------------------
// Follows — the original 12 edges are preserved exactly. The demo/dev
// account (ava_walker) explicitly gains 8 more follows (10 total) so her
// feed is never empty. The rest of the graph is generated deterministically.
// ---------------------------------------------------------------------------
const EXISTING_FOLLOWS = [
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

// ava_walker is the account used for local dev/demo login — she needs a
// populated feed immediately after logging in, so she explicitly follows a
// broad, varied set of users on top of her 2 original follows (10 total).
const DEMO_ACCOUNT_USERNAME = 'ava_walker'
const DEMO_EXTRA_FOLLOWS = [
  'priya_sharma', 'marcus_webb', 'victor_alvarez', 'chloe_bennett',
  'sofia_rossi', 'aiko_tanaka', 'owen_fitzgerald', 'mateo_silva',
]

const followKey = (followerId, followingId) => `${followerId}|${followingId}`
const takenFollowKeys = new Set(EXISTING_FOLLOWS.map((f) => followKey(f.followerId, f.followingId)))

const EXPLICIT_FOLLOWS = DEMO_EXTRA_FOLLOWS.map((username) => ({
  followerId: U[DEMO_ACCOUNT_USERNAME],
  followingId: U[username],
}))
EXPLICIT_FOLLOWS.forEach((f) => takenFollowKeys.add(followKey(f.followerId, f.followingId)))

const FOLLOW_COUNT_PATTERN = [3, 4, 5, 6]
const GENERATED_FOLLOWS = []
USERS.forEach((user, i) => {
  // ava_walker's follow list is fully curated above — skip the generic pass.
  if (user.username === DEMO_ACCOUNT_USERNAME) return

  const count = FOLLOW_COUNT_PATTERN[i % FOLLOW_COUNT_PATTERN.length]
  const targets = pickUsers(count, i * 13 + 9, [user.id], (uid) => takenFollowKeys.has(followKey(user.id, uid)))
  targets.forEach((followingId) => {
    takenFollowKeys.add(followKey(user.id, followingId))
    GENERATED_FOLLOWS.push({ followerId: user.id, followingId })
  })
})

const FOLLOWS = [...EXISTING_FOLLOWS, ...EXPLICIT_FOLLOWS, ...GENERATED_FOLLOWS]

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------
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
  const seen = new Set()
  for (const follow of FOLLOWS) {
    if (follow.followerId === follow.followingId) {
      // Defense in depth: the generation logic above never does this, but a
      // user can never be allowed to follow themselves.
      throw new Error(`Refusing to seed a self-follow for user ${follow.followerId}`)
    }

    const key = followKey(follow.followerId, follow.followingId)
    if (seen.has(key)) {
      throw new Error(`Refusing to seed a duplicate follow edge: ${key}`)
    }
    seen.add(key)

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

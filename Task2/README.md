# Connectly

### CodeAlpha Full Stack Development Internship — Task 2

Connectly is a full-stack social media platform developed as part of the **CodeAlpha Full Stack Development Internship**.

The platform allows users to create profiles, publish posts, interact through likes and comments, follow other users, discover content, and search for people.

The application uses a **React frontend**, **Express.js REST API**, **Prisma ORM**, and **PostgreSQL database**.

---

## 🚀 Project Overview

Connectly provides the core functionality of a modern social networking platform.

Users can:

- Create an account and log in
- Manage their profile
- Create, edit, and delete their own posts
- Like and unlike posts
- Add, edit, and delete their own comments
- Follow and unfollow other users
- View followers and following
- View a personalized home feed
- Explore public posts
- Search for users
- Browse a populated social-media dataset

All application data is stored in a real PostgreSQL database and accessed through the Express.js backend.

---

## ✨ Key Features

### 🔐 Authentication

- User registration
- User login
- JWT-based authentication
- Password hashing using bcrypt
- Protected API routes
- Logout functionality

### 👤 User Profiles

- Public user profiles
- Username and display name
- Bio
- Avatar
- Join date
- Followers count
- Following count
- Profile editing

### 📝 Posts

- Create posts
- Text-based posts
- Optional image URLs
- View posts
- Edit own posts
- Delete own posts
- Post pagination
- Like and comment counts

### ❤️ Likes

- Like posts
- Unlike posts
- View like status
- Like counts
- Duplicate likes prevented at database level

### 💬 Comments

- Add comments
- View comments
- Edit own comments
- Delete own comments
- Comment pagination
- Comment counts

### 👥 Follow System

- Follow users
- Unfollow users
- Check follow status
- View followers
- View following
- Self-follow prevention
- Duplicate follow prevention

### 🏠 Home Feed

The Home page provides a personalized feed containing:

- The user's own posts
- Posts from users they follow
- Recent posts first
- Like counts
- Comment counts
- Pagination

### 🌎 Explore

The Explore page provides a public discovery feed containing posts from the Connectly community.

It includes:

- Text posts
- Image posts
- Multiple authors
- Like/comment counts
- Pagination

### 🔎 User Search

Users can search for other accounts using:

- Username
- Display name

Search is case-insensitive and paginated.

---

# 🛠️ Technology Stack

## Frontend

- React
- TypeScript
- TanStack Start
- TanStack Router
- Vite
- Tailwind CSS
- Lucide React

## Backend

- Node.js
- Express.js
- REST API
- JWT
- bcryptjs

## Database

- PostgreSQL
- Prisma ORM

## Development Tools

- Docker
- Docker Compose
- npm
- Git
- GitHub

---

# 🏗️ System Architecture

```mermaid
flowchart TD
    A[User / Browser] --> B[React + TypeScript Frontend]

    B --> C[REST API Requests]

    C --> D[Express.js Backend]

    D --> E[Authentication Middleware]
    D --> F[Controllers]

    E --> F
    F --> G[Service Layer]

    G --> H[Prisma ORM]

    H --> I[(PostgreSQL Database)]
```

The application follows a layered architecture:

**Frontend → API → Controllers → Services → Prisma → PostgreSQL**

This keeps UI logic, API handling, business logic, and database operations separated.

---

# 🔄 Request Flow

A typical request follows this flow:

```mermaid
sequenceDiagram
    participant U as User
    participant F as React Frontend
    participant A as Express API
    participant C as Controller
    participant S as Service
    participant P as Prisma
    participant D as PostgreSQL

    U->>F: User Action
    F->>A: HTTP Request
    A->>C: Route Handler
    C->>S: Business Logic
    S->>P: Database Query
    P->>D: SQL Query
    D-->>P: Database Result
    P-->>S: Data
    S-->>C: Response Data
    C-->>A: JSON Response
    A-->>F: API Response
    F-->>U: Updated UI
```

---

# 🔐 Authentication Flow

```mermaid
flowchart LR
    A[Register / Login] --> B[Express Auth API]
    B --> C[Validate Input]
    C --> D[bcrypt Password Handling]
    D --> E[PostgreSQL]
    E --> F[Generate JWT]
    F --> G[Frontend]
    G --> H[Authenticated API Requests]
    H --> I[JWT Middleware]
    I --> J[Protected Resource]
```

Passwords are never stored as plain text.

The backend stores a bcrypt hash and uses JWTs to authenticate protected requests.

---

# 🗄️ Database Design

Connectly uses PostgreSQL with Prisma ORM.

The main entities are:

- User
- Post
- Comment
- Like
- Follow

```mermaid
erDiagram
    USER ||--o{ POST : creates
    USER ||--o{ COMMENT : writes
    POST ||--o{ COMMENT : contains
    USER ||--o{ LIKE : creates
    POST ||--o{ LIKE : receives
    USER ||--o{ FOLLOW : follower
    USER ||--o{ FOLLOW : following

    USER {
        uuid id PK
        string name
        string username UK
        string email UK
        string passwordHash
        string bio
        string avatarUrl
        datetime createdAt
        datetime updatedAt
    }

    POST {
        uuid id PK
        string content
        string imageUrl
        uuid authorId FK
        datetime createdAt
        datetime updatedAt
    }

    COMMENT {
        uuid id PK
        string content
        uuid postId FK
        uuid authorId FK
        datetime createdAt
        datetime updatedAt
    }

    LIKE {
        uuid userId PK
        uuid postId PK
        datetime createdAt
    }

    FOLLOW {
        uuid followerId PK
        uuid followingId PK
        datetime createdAt
    }
```

### Relationships

- One user can create many posts
- One user can create many comments
- One post can contain many comments
- Users can like many posts
- Users can follow many other users
- A composite key prevents duplicate likes
- A composite key prevents duplicate follow relationships

---

# 📰 Feed Architecture

The personalized feed works by finding the users followed by the authenticated user and retrieving posts from those accounts along with the user's own posts.

```mermaid
flowchart TD
    A[Authenticated User] --> B[Get Followed Users]
    B --> C[Include Own User ID]
    C --> D[Find Posts]
    D --> E[Sort by Created Time]
    E --> F[Apply Pagination]
    F --> G[Get Like & Comment Counts]
    G --> H[Resolve Viewer Like Status]
    H --> I[Return Feed]
```

The backend determines the authenticated user from the JWT rather than accepting a user ID from the client.

---

# ❤️ Social Interaction Flow

```mermaid
flowchart LR
    A[User] --> B[Post]
    B --> C[Like]
    B --> D[Comment]
    A --> E[Follow]
    E --> F[Another User]
```

These relationships are persisted in PostgreSQL.

---

# 🔌 API Overview

## Health

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | No | API health |
| GET | `/api/health/db` | No | Database health |

## Authentication

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Get current user |

## Users

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/users/:username` | No | View profile |
| GET | `/api/users/me` | Yes | View own profile |
| PATCH | `/api/users/me` | Yes | Update profile |
| GET | `/api/users/search` | No | Search users |

## Posts

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/posts` | Yes | Create post |
| GET | `/api/posts` | No | List posts |
| GET | `/api/posts/:postId` | No | View post |
| PATCH | `/api/posts/:postId` | Yes | Edit own post |
| DELETE | `/api/posts/:postId` | Yes | Delete own post |

## Feed & Explore

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/feed` | Yes | Personalized feed |
| GET | `/api/explore` | No | Public discovery feed |

## Likes

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/posts/:postId/like` | Yes | Like post |
| GET | `/api/posts/:postId/like` | Yes | Check like status |
| DELETE | `/api/posts/:postId/like` | Yes | Unlike post |

## Comments

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/posts/:postId/comments` | Yes | Create comment |
| GET | `/api/posts/:postId/comments` | No | List comments |
| PATCH | `/api/comments/:commentId` | Yes | Edit own comment |
| DELETE | `/api/comments/:commentId` | Yes | Delete own comment |

## Follows

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/users/:username/follow` | Yes | Follow user |
| GET | `/api/users/:username/follow` | Yes | Check follow status |
| DELETE | `/api/users/:username/follow` | Yes | Unfollow user |
| GET | `/api/users/:username/followers` | No | View followers |
| GET | `/api/users/:username/following` | No | View following |

---

# 🎨 UI / UX

Connectly uses a modern social-media interface rather than a plain HTML frontend.

### Design Direction

- Dark premium interface
- Violet / indigo primary color
- Cyan accent
- Inter typography
- Rounded cards and surfaces
- Subtle borders
- Soft shadows
- Responsive layouts
- Sidebar navigation on desktop
- Mobile-friendly navigation
- Post cards
- Profile layouts
- Discover People section
- Authentication screens
- Settings page
- Loading states
- Empty states
- Error states
- Dark/light mode

The interface is designed to remain clean and focused while providing a modern social-platform experience.

---

# 📱 Responsive Design

The application is designed for:

- Mobile — 390px
- Tablet — 768px
- Desktop — 1280px
- Large desktop — 1440px

The layout adapts between:

```text
Mobile
   ↓
Compact navigation
   ↓
Single-column content

Tablet
   ↓
Responsive content layout

Desktop
   ↓
Sidebar + Main Feed + Discovery Panel
```

---

# 🌱 Demo Dataset

Connectly includes a populated deterministic demo dataset for development and demonstration.

### Seeded Data

| Entity | Records |
|---|---:|
| Users | 36 |
| Posts | 141 |
| Comments | 190 |
| Likes | 414 |
| Follows | 179 |

The dataset provides enough interconnected content to demonstrate:

- Home feed
- Explore
- Discover People
- User search
- Profiles
- Followers
- Following
- Likes
- Comments

The seed process is designed to be idempotent and avoids duplicate users, likes, and follow relationships.

---

# 🐳 PostgreSQL with Docker

Task2 uses a dedicated PostgreSQL Docker container.

```text
Container: connectly-task2-postgres
PostgreSQL: 16-alpine
Database: connectly
Host Port: 5433
Container Port: 5432
```

This dedicated database keeps Task2 separate from the other internship projects.

Start PostgreSQL:

```bash
docker compose up -d
```

Check containers:

```bash
docker ps
```

Stop the database:

```bash
docker compose down
```

---

# ⚙️ Local Setup

## 1. Clone the Repository

```bash
git clone https://github.com/harsha282004/CodeAlpha_FullStack_Internship.git
```

## 2. Enter Task2

```bash
cd CodeAlpha_FullStack_Internship/Task2
```

## 3. Install Dependencies

```bash
npm install
```

If required by the workspace configuration:

```bash
cd client
npm install
cd ..
```

## 4. Configure Environment

Create:

```text
server/.env
```

using `.env.example` as the reference.

Required variables:

```env
PORT=5001
DATABASE_URL="postgresql://connectly:YOUR_PASSWORD@localhost:5433/connectly?schema=public"
JWT_SECRET=YOUR_SECRET
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173
```

Never commit real secrets.

## 5. Start PostgreSQL

```bash
docker compose up -d
```

## 6. Generate Prisma Client

```bash
cd server
npx prisma generate
```

## 7. Apply Database Migrations

```bash
npx prisma migrate deploy
```

## 8. Seed Demo Data

```bash
cd ..
npm run db:seed
```

## 9. Start Backend

```bash
npm run dev:server
```

Backend:

```text
http://localhost:5001
```

## 10. Start Frontend

Open another terminal:

```bash
cd CodeAlpha_FullStack_Internship/Task2
npm run dev:client
```

Frontend:

```text
http://localhost:5173
```

---

# 🧪 Testing & Verification

The project has been tested across the major application areas.

### Backend

- Authentication
- User profiles
- Posts
- Likes
- Comments
- Follows
- Feed
- Explore
- User search
- Pagination
- Health endpoints
- Error handling
- Authentication protection
- Ownership checks

### Frontend

- Login
- Registration
- Home feed
- Explore
- Search
- Profiles
- Settings
- Follow interactions
- Like interactions
- Comments
- Responsive layouts

### Development Checks

```bash
npx tsc --noEmit
```

```bash
npm run build
```

```bash
npm audit
```

```bash
git diff --check
```

---

# 🔒 Security

Connectly includes several basic security measures:

- bcrypt password hashing
- JWT authentication
- Protected API routes
- Backend authorization
- Owner-only post editing/deletion
- Owner-only comment editing/deletion
- Input validation
- Username normalization
- Email normalization
- UUID validation
- Pagination validation
- CORS configuration
- Environment-based secrets
- Generic server error responses
- Duplicate like prevention
- Duplicate follow prevention
- Self-follow prevention
- Password hashes are never returned through public APIs

---

# 📂 Project Structure

```text
Task2/
│
├── client/
│   ├── src/
│   │   ├── routes/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── styles/
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.js
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   │
│   └── package.json
│
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

---

# 📋 CodeAlpha Requirement Mapping

| CodeAlpha Task 2 Requirement | Connectly Implementation |
|---|---|
| User Profiles | ✅ |
| Posts | ✅ |
| Comments | ✅ |
| Like System | ✅ |
| Follow System | ✅ |
| Users Database | ✅ |
| Posts Database | ✅ |
| Comments Database | ✅ |
| Followers Database | ✅ |
| Authentication | ✅ |
| REST API | ✅ |
| Personalized Feed | ✅ |
| Explore Page | ✅ |
| User Search | ✅ |
| Responsive Frontend | ✅ |

---

# 📈 Project Status

## Completed

- ✅ Full-stack social media platform
- ✅ React frontend
- ✅ Express.js backend
- ✅ PostgreSQL database
- ✅ Prisma ORM
- ✅ JWT authentication
- ✅ User profiles
- ✅ Posts
- ✅ Likes
- ✅ Comments
- ✅ Follows
- ✅ Personalized feed
- ✅ Explore page
- ✅ User search
- ✅ Pagination
- ✅ Responsive UI
- ✅ Dark/light mode
- ✅ Validation
- ✅ Authorization
- ✅ Docker PostgreSQL
- ✅ Demo dataset
- ✅ Error handling

---

# 🔮 Future Improvements

Potential future extensions include:

- Real-time notifications
- Direct messaging
- WebSocket integration
- Image upload/storage
- Hashtags
- Mentions
- Bookmarks
- Advanced search
- Email verification
- Password reset
- OAuth login
- Infinite scrolling
- Content recommendation system

These features are outside the current CodeAlpha Task 2 implementation.

---

# 🎓 Internship

**CodeAlpha Full Stack Development Internship**

**Task:** Task 2 — Social Media Platform

**Project:** Connectly

**Repository:** `CodeAlpha_FullStack_Internship`

---

## 👨‍💻 Project Summary

Connectly demonstrates the development of a complete full-stack social media application using modern frontend technologies, a RESTful backend, relational database design, authentication, authorization, and real user interactions.

The project implements the core requirements of the **CodeAlpha Social Media Platform task** while extending them with personalized feeds, discovery, search, pagination, responsive UI, and a populated PostgreSQL-backed demo environment.

# ShopSphere — Client

React + TanStack Start (Router, Query) frontend for ShopSphere, styled with Tailwind CSS and shadcn/ui.

Connects to the existing Express + Prisma + PostgreSQL backend in `../server`.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and point it at the running backend:

```
VITE_API_URL=http://localhost:5000/api
```

## Development

```bash
npm run dev
```

Starts the Vite dev server (default `http://localhost:5173`). The backend (`../server`) must be running separately for any data to load.

## Build

```bash
npm run build
```

## Structure

```
src/
├── routes/          file-based routes (TanStack Router)
├── components/
│   ├── shop.tsx      shared storefront UI (navbar, footer, product card, states)
│   ├── admin.tsx      shared admin layout/panel
│   ├── status-badge.tsx
│   └── ui/            shadcn/ui primitives
├── lib/
│   ├── api.ts         typed HTTP client for the real backend (no mock data)
│   ├── store.tsx       auth + cart context (JWT in localStorage, cart in localStorage)
│   └── guards.tsx      useRequireAuth / useRequireAdmin route guards
└── assets/            product photography used for hero/category imagery
```

## Authentication

JWTs are stored in `localStorage` and sent as `Authorization: Bearer <token>`. Session is restored on load via `GET /api/auth/me`; an invalid/expired token is cleared silently.

## Cart

Cart lives entirely in `localStorage` (`shopsphere_cart`) - it is never a backend resource. The backend remains the source of truth for price and stock; checkout always uses the server-calculated total.

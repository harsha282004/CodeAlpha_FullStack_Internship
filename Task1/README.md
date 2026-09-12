# ShopSphere — Task 1 (Full Stack E-commerce Store)

Full stack e-commerce store built for CodeAlpha Full Stack Development Internship, Task 1.

**Stack:** React + Vite + Tailwind CSS (client) · Node.js + Express (server) · PostgreSQL + Prisma · JWT + bcrypt auth.

## Status

Phase 1 — project scaffolding only. No database, authentication, or business features yet.

## Project structure

```
Task1/
├── client/   # React + Vite + Tailwind frontend
└── server/   # Express backend
```

## Setup

```bash
cd Task1
npm install
```

This installs dependencies for both `client` and `server` via npm workspaces.

Copy `.env.example` to `server/.env` (and add a `client/.env` if needed) and fill in real values.

## Running in development

Run each in its own terminal, from the `Task1` directory:

```bash
npm run dev:client   # starts the Vite dev server (http://localhost:5173)
npm run dev:server   # starts the Express API with --watch (http://localhost:5000)
```

## Building the client

```bash
npm run build:client
```

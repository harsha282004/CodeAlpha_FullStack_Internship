# Connectly

CodeAlpha Full Stack Development Internship — Task 2

A full-stack social media platform built with React, Express.js and PostgreSQL.

## Status

This project is currently in the scaffolding phase. The frontend and backend
skeletons are in place, but no social-media features (auth, posts, comments,
likes, follows, profiles) have been implemented yet.

## Stack

- **Frontend:** React, TypeScript, TanStack Start, Vite, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Auth foundation:** JWT, bcryptjs

## Project structure

```
Task2/
├── client/   # TanStack Start + React + TypeScript frontend
├── server/   # Express.js backend
├── package.json
├── .gitignore
└── .env.example
```

## Getting started

1. Copy `.env.example` to `server/.env` and fill in real values.
2. Install dependencies: `npm run install:all`
3. Start the backend: `npm run dev:server`
4. Start the frontend: `npm run dev:client`

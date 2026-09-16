# CodeAlpha Full Stack Development Internship

> Full Stack Development Internship projects completed during the CodeAlpha internship.

![GitHub](https://img.shields.io/badge/GitHub-Repository-black?logo=github)
![React](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript-blue?logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-green?logo=node.js)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue?logo=postgresql)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?logo=prisma)

---

## 📌 About the Internship

This repository contains the projects developed during my **Full Stack Development Internship at CodeAlpha**.

The internship provided practical experience in building complete web applications using modern frontend and backend technologies.

The assigned domain was **Full Stack Development**, covering:

- Frontend development
- Backend development
- REST API development
- Database integration
- Authentication
- Application architecture
- Testing
- Real-world project implementation

According to the internship requirements, participants were required to complete **any 2 or 3 of the 4 assigned tasks**.

I completed **3 tasks**:

1. **Task 1 — Simple E-commerce Store**
2. **Task 2 — Social Media Platform**
3. **Task 3 — Project Management Tool**

**Task 4 — Real-Time Communication App** was not selected.

---

# 🚀 Completed Projects

| Task | Project | Description | Status |
|------|---------|-------------|--------|
| Task 1 | [ShopSphere](./Task1) | Full-stack E-commerce Store | ✅ Completed |
| Task 2 | [Connectly](./Task2) | Social Media Platform | ✅ Completed |
| Task 3 | [TaskFlow](./Task3) | Collaborative Project Management Tool | ✅ Completed |
| Task 4 | Real-Time Communication App | Video conferencing & collaboration | ⏭️ Not Selected |

---

# 🛒 Task 1 — ShopSphere

## Simple E-commerce Store

[**View Task 1 →**](./Task1)

### 📌 Objective

The objective of Task 1 was to build a basic full-stack e-commerce application with:

- Product listings
- Product details
- Shopping cart
- Order processing
- User registration and login
- Database storage for products, users and orders

### 💡 Project Overview

**ShopSphere** is a complete full-stack e-commerce web application designed to provide a modern shopping experience.

Users can browse products, search the catalogue, view product details, add products to their cart, complete checkout and view their orders.

An administration interface is also included for managing products and orders.

### ✨ Features

#### Customer Features

- User registration
- User login
- JWT authentication
- Product catalogue
- Product search
- Category filtering
- Product details
- Pagination
- Shopping cart
- Quantity management
- Stock validation
- Checkout
- Order creation
- Order history
- Order details
- User profile

#### Admin Features

- Admin dashboard
- Product management
- Product creation
- Product updates
- Product deletion
- Order management
- Order status updates
- User management

### 🛠️ Technology Stack

**Frontend**
- React
- TypeScript
- TanStack Start
- Vite
- Tailwind CSS

**Backend**
- Node.js
- Express.js

**Database**
- PostgreSQL

**ORM**
- Prisma

**Authentication**
- JWT
- bcryptjs

### 🗄️ Database

The main database entities include:

- User
- Product
- Order
- OrderItem

The `OrderItem` stores the purchase-time unit price so historical orders remain accurate even if the product price changes later.

### 🛍️ Shopping Cart

The shopping cart is maintained on the client using `localStorage`.

Cart information includes:

- Product ID
- Product name
- Product slug
- Price
- Image
- Quantity
- Stock

The cart persists after page refresh.

### 💳 Checkout

The project implements a simulated checkout flow.

The server calculates the final order total using the actual product prices stored in the database rather than trusting prices sent by the client.

No real payment gateway was integrated.

### 🔐 Security

- Passwords are hashed using bcrypt.
- JWT is used for authenticated requests.
- Backend authorization protects admin functionality.
- Password hashes are never returned through API responses.
- Client-provided prices and totals are not trusted by the backend.

### 🧪 Testing

Task 1 was tested through backend/API checks and browser-based verification.

Final recorded results include:

- Customer flow: **17/17 tests passed**
- Admin flow: **9/9 tests passed**
- Responsive testing performed
- Checkout and order persistence verified
- Stock handling and concurrent order behavior verified

---

# 📱 Task 2 — Connectly

## Social Media Platform

[**View Task 2 →**](./Task2)

### 📌 Objective

The objective of Task 2 was to build a mini social media platform supporting:

- User profiles
- Posts
- Comments
- Likes
- Follow system
- Database storage for users, posts, comments and followers

### 💡 Project Overview

**Connectly** is a full-stack social media platform where users can create profiles, publish posts, interact with posts and connect with other users.

The application uses a real PostgreSQL database and REST APIs for persistent social interactions.

### ✨ Features

#### User Features

- User registration
- User login
- JWT authentication
- User profiles
- Profile editing
- User search
- Feed
- Explore/discovery
- Followers
- Following

#### Post Features

- Create posts
- View posts
- Update posts
- Delete posts
- Like posts
- Unlike posts
- Like counts
- Comment counts

#### Comment Features

- Add comments
- View comments
- Edit own comments
- Delete own comments
- Paginated comments

#### Follow Features

- Follow users
- Unfollow users
- View followers
- View following users
- Follow status handling

### 🛠️ Technology Stack

**Frontend**
- React
- TypeScript
- TanStack Start
- TanStack Router
- Vite
- Tailwind CSS
- Lucide React

**Backend**
- Node.js
- Express.js

**Database**
- PostgreSQL

**ORM**
- Prisma

**Authentication**
- JWT
- bcrypt

**Infrastructure**
- Docker
- Docker Compose

### 🗄️ Database

The main entities include:

- User
- Post
- Comment
- Like
- Follow

These relationships allow the application to implement social interactions using persistent relational data.

### 🎨 UI/UX

The frontend includes:

- Responsive layouts
- Desktop sidebar
- Mobile navigation
- Dark/light theme
- Loading skeletons
- Empty states
- Error states
- Toast notifications
- Accessible forms and controls
- Responsive post and profile layouts

### 🔐 Security

- bcrypt password hashing
- JWT authentication
- Protected routes
- Server-side authorization
- Safe user serialization
- Password hashes excluded from responses
- Restricted CORS configuration

### 🧪 Testing

The project was tested at API and browser levels.

Testing covered:

- Authentication
- Profiles
- Posts
- Likes
- Comments
- Follows
- Search
- Feed
- Explore
- Responsive behavior
- Logout/login flow
- Ownership authorization

A deterministic and idempotent database seed was also created for demonstration and testing.

---

# 📋 Task 3 — TaskFlow

## Collaborative Project Management Tool

[**View Task 3 →**](./Task3)

### 📌 Objective

The objective of Task 3 was to build a collaborative project management application similar to tools such as Trello or Asana.

The required functionality included:

- Group projects
- Task assignment
- Comments and communication
- Authentication
- Project boards
- Task cards
- Backend management of users, projects, tasks and comments

The task also provided bonus functionality for:

- Notifications
- Real-time updates

### 💡 Project Overview

**TaskFlow** is a full-stack collaborative project management application.

Its purpose is to help teams:

- Create projects
- Add team members
- Assign work
- Organize tasks
- Track task progress
- Communicate through comments
- Receive notifications
- Collaborate in real time

### 🏗️ Application Structure

```text
User
 │
 ├── Projects
 │      │
 │      ├── Members
 │      │
 │      └── Boards
 │             │
 │             ├── To Do
 │             │    └── Tasks
 │             │
 │             ├── In Progress
 │             │    └── Tasks
 │             │
 │             ├── Review
 │             │    └── Tasks
 │             │
 │             └── Done
 │                  └── Tasks
 │
 ├── Notifications
 │
 └── Profile

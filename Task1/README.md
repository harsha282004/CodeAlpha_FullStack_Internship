CodeAlpha_FullStack_Internship
Full Stack Development Internship projects completed during the CodeAlpha internship.

🛒 Task 1 — ShopSphere
Modern commerce. Simple shopping.

ShopSphere is a complete full-stack e-commerce web application developed as part of the CodeAlpha Full Stack Development Internship — Task 1: Simple E-commerce Store.

The project was built as a real-world full-stack application rather than a static frontend demo. It includes a responsive customer storefront, authentication, product catalogue, shopping cart, secure checkout, order management, PostgreSQL database integration, and a dedicated admin dashboard.

📌 CodeAlpha Task 1
The CodeAlpha Task 1 specification requires a simple e-commerce website with:

Product listings
Product details
Shopping cart
Order processing
User registration/login
Database storage for products, users, and orders
Frontend
Django or Express.js backend
ShopSphere implements all of these requirements using React/TypeScript on the frontend, Express.js on the backend, PostgreSQL for data storage, and Prisma ORM for database access.

🎯 Project Objective
The objective of ShopSphere was to build a complete e-commerce workflow where a user can:

Browse Products
      ↓
Search / Filter Products
      ↓
View Product Details
      ↓
Add Products to Cart
      ↓
Register / Login
      ↓
Enter Shipping Information
      ↓
Checkout
      ↓
Server Validates Price + Stock
      ↓
Order Created
      ↓
View Order
      ↓
Track Order Status

## 🏗️ Architecture Flow

```text
┌──────────────────────────────────────────────────────────────┐
│                         USER                                 │
│                                                              │
│              Customer / Administrator                       │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             │ HTTP / REST API
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                     SHOPSPHERE FRONTEND                      │
│                                                              │
│  React + TypeScript + TanStack Start + Vite + Tailwind CSS  │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │   Home     │  │  Products  │  │   Product Details      │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │    Cart    │  │  Checkout  │  │    Orders / Profile    │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                 Admin Dashboard                         │  │
│  │  Products │ Orders │ Users │ Statistics                │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             │ REST API Requests
                             │ JSON
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                       EXPRESS.JS BACKEND                     │
│                                                              │
│  ┌────────────────┐     ┌────────────────────────────────┐  │
│  │ Authentication │     │        API Routes              │  │
│  │ JWT + bcrypt   │     │ Products / Orders / Admin      │  │
│  └───────┬────────┘     └───────────────┬────────────────┘  │
│          │                              │                    │
│          ▼                              ▼                    │
│  ┌────────────────┐     ┌────────────────────────────────┐  │
│  │ Authentication │     │ Controllers / Services         │  │
│  │ Middleware     │     │ Business Logic / Validation    │  │
│  └───────┬────────┘     └───────────────┬────────────────┘  │
│          │                              │                    │
│          └──────────────┬───────────────┘                    │
│                         ▼                                    │
│                 ┌─────────────────┐                          │
│                 │ Error Handling  │                          │
│                 │ & Validation    │                          │
│                 └────────┬────────┘                          │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           │ Database Queries
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                       PRISMA ORM                             │
│                                                              │
│  Schema │ Migrations │ Transactions │ Type-safe Queries     │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             │ SQL
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                      POSTGRESQL                              │
│                                                              │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐             │
│  │  Users   │     │ Products │     │  Orders  │             │
│  └──────────┘     └──────────┘     └────┬─────┘             │
│                                          │                   │
│                                   ┌──────▼──────┐            │
│                                   │ OrderItems  │            │
│                                   └─────────────┘            │
└──────────────────────────────────────────────────────────────┘

React + TypeScript + TanStack Start
                ↓
             REST API
                ↓
          Node.js + Express
                ↓
             Prisma ORM
                ↓
           PostgreSQL

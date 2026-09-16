# TaskFlow

### CodeAlpha Full Stack Development Internship — Task 3

TaskFlow is a full-stack **Collaborative Project Management Tool** developed as part of the CodeAlpha Full Stack Development Internship.

It helps teams create projects, manage members, assign tasks, track progress using Kanban boards, communicate through comments, receive notifications, and collaborate in real time.

---

## 📌 Project Objective

The objective of Task 3 was to build a project management application where users can:

- Create and manage projects
- Add and manage team members
- Assign tasks to members
- Organize tasks using boards
- Track task progress
- Add comments and communicate
- Receive notifications
- Collaborate in real time

---

## ✨ Features

### 🔐 Authentication

- User registration
- User login
- JWT authentication
- Password hashing using bcrypt
- Protected API routes
- Current user profile

### 📁 Project Management

- Create projects
- View projects
- Update projects
- Delete projects
- Add project members
- Remove members
- Change member roles

### 👥 Roles

TaskFlow supports three project roles:

- **OWNER**
- **ADMIN**
- **MEMBER**

Each role has different permissions for managing projects, members, boards and tasks.

### 📋 Kanban Boards

Projects contain boards that represent different stages of work.

Example:

```text
To Do → In Progress → Review → Done

🏗️ Architecture
                  TASKFLOW
                     │
                     ▼
             React + TypeScript
                     │
                     │ REST API
                     ▼
              Express.js Backend
                     │
                     ▼
                Service Layer
                     │
                     ▼
                   Prisma
                     │
                     ▼
                PostgreSQL
                     
                     ▲
                     │
                 Socket.IO
                     │
                     ▼
             Connected Members

🗄️ Database Structure
User
 │
 ├── Project
 │      │
 │      ├── ProjectMember
 │      │
 │      └── Board
 │             │
 │             └── Task
 │                    │
 │                    ├── TaskAssignee
 │                    └── Comment
 │
 ├── Notification
 │
 └── Activity

🔒 Security

TaskFlow implements server-side security and authorization.

Authentication
Passwords are hashed using bcrypt.
JWT is used to authenticate API requests.
Protected routes require authentication.

📊 Demo Dataset

The TaskFlow demo dataset contains realistic relational data for demonstrating the application.

Initial seed data includes:

15 users
4 projects
22 project members
16 boards
40 tasks
60 task assignments
120 comments
148 notifications
242 activities

The seed process was tested for deterministic and idempotent behavior.

📂 Project Structure
Task3/
│
├── client/
│   └── React + TypeScript frontend
│
├── server/
│   └── Express + Prisma backend
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── PROJECTS.md
│   ├── BOARDS.md
│   ├── TASKS.md
│   ├── COMMENTS.md
│   ├── NOTIFICATIONS.md
│   ├── REALTIME.md
│   └── SECURITY_AUDIT.md
│
├── docker-compose.yml
├── package.json
└── README.md

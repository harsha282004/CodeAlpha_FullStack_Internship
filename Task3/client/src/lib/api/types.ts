// Shared response types. Every shape here mirrors an actual `toXSummary()`
// serializer in server/src/utils/*.js — never invented or assumed. If the
// backend adds/removes a field from a serializer, this file should change
// to match it, not the other way around.

export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_COMMENTED'
  | 'TASK_UPDATED'
  | 'TASK_MOVED'
  | 'PROJECT_MEMBER_ADDED'

// The authenticated user's own view of themselves (register/login/me) —
// matches utils/user.js's toSafeUser(). Never includes passwordHash.
export interface CurrentUser {
  id: string
  name: string
  username: string
  email: string
  bio: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

// What anyone else sees when looking up a username — matches toPublicUser().
export interface PublicUser {
  id: string
  name: string
  username: string
  bio: string | null
  avatarUrl: string | null
  createdAt: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Matches utils/project.js's toProjectSummary() — role/memberCount are only
// present when the backend actually computed them for this call.
export interface Project {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  role?: ProjectRole
  memberCount?: number
}

// Matches utils/project.js's toMemberSummary().
export interface ProjectMember {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  role: ProjectRole
  joinedAt: string
}

// Matches utils/board.js's toBoardSummary(). A Board is this app's Kanban
// column — there is no separate "column" concept in the backend.
export interface Board {
  id: string
  projectId: string
  name: string
  position: number
  createdAt: string
  updatedAt: string
}

// Matches utils/task.js's toTaskSummary(). Deliberately has no `status`
// field — a task's workflow stage is which Board it's on, not a parallel
// enum (see task.validator.js).
export interface Task {
  id: string
  projectId: string
  boardId: string
  title: string
  description: string | null
  priority: TaskPriority
  position: number
  dueDate: string | null
  createdById: string
  createdAt: string
  updatedAt: string
}

// Matches utils/assignment.js's toAssigneeSummary().
export interface Assignee {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  assignedAt: string
}

// Matches utils/comment.js's toCommentSummary().
export interface Comment {
  id: string
  taskId: string
  content: string
  author: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
  }
  createdAt: string
  updatedAt: string
}

// Matches utils/notification.js's toNotificationSummary().
export interface Notification {
  id: string
  type: NotificationType
  message: string
  projectId: string | null
  taskId: string | null
  read: boolean
  createdAt: string
}

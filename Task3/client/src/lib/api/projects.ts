import { del, get, patch, post } from './client'
import type { Pagination, Project, ProjectMember, ProjectRole } from './types'

export interface CreateProjectInput {
  name: string
  description?: string | null
}

export interface UpdateProjectInput {
  name?: string
  description?: string | null
}

// OWNER is deliberately not assignable here — the backend's own validator
// rejects it (see membership.validator.js's ASSIGNABLE_ROLES). There is
// exactly one OWNER per project and no endpoint ever assigns that role.
export type AssignableRole = 'ADMIN' | 'MEMBER'

export const projectsApi = {
  list: (page?: number, limit?: number) =>
    get<{ projects: Project[]; pagination: Pagination }>('/projects', { page, limit }),
  create: (input: CreateProjectInput) => post<{ project: Project }>('/projects', input),
  get: (projectId: string) => get<{ project: Project }>(`/projects/${projectId}`),
  update: (projectId: string, input: UpdateProjectInput) =>
    patch<{ project: Project }>(`/projects/${projectId}`, input),
  remove: (projectId: string) => del<{ message: string }>(`/projects/${projectId}`),

  // Membership lives under /projects/:id/members in the backend, but isn't
  // a separately-named API area in this app's own API layer (the milestone
  // spec's eight named areas don't include one) — grouped here since a
  // member only ever exists in the context of a project.
  listMembers: (projectId: string) => get<{ members: ProjectMember[] }>(`/projects/${projectId}/members`),
  addMember: (projectId: string, userId: string, role?: AssignableRole) =>
    post<{ member: ProjectMember }>(`/projects/${projectId}/members`, { userId, ...(role ? { role } : {}) }),
  removeMember: (projectId: string, userId: string) =>
    del<{ message: string }>(`/projects/${projectId}/members/${userId}`),
  changeMemberRole: (projectId: string, userId: string, role: AssignableRole) =>
    patch<{ member: ProjectMember }>(`/projects/${projectId}/members/${userId}`, { role }),
}

export type { ProjectRole }

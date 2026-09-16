import { AppError } from '../utils/AppError.js'

const TITLE_MAX_LENGTH = 200
const DESCRIPTION_MAX_LENGTH = 2000

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The Task model has no `status` field or enum — a task's workflow stage
// is represented by which Board it's on (board names are free-text
// per-project data, e.g. "To Do"/"In Progress"/"Done", by design — see
// ARCHITECTURE.md Section 12). Adding a parallel `status` enum would give
// a task two, potentially contradictory, ideas of its own workflow stage.
// `status` is called out by name below so a client submitting it gets a
// clear explanation instead of a generic "unsupported field."
const TASK_PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])

// Whitelisting is also what makes id/projectId/createdById/createdAt/
// updatedAt all rejected the same way on update — there is no separate
// blocklist to keep in sync. The parent project always comes from the
// URL, never a body field, on create. `boardId` is deliberately NOT
// creatable (a task is always created on the board named in the URL) but
// IS updatable — that's how a task actually moves to a different board
// (this project's "move a card between columns" operation); the target
// board is still verified server-side to belong to the same project (see
// task.service.js's updateTask), so this can never be used to smuggle a
// task into another project.
const CREATABLE_FIELDS = new Set(['title', 'description', 'priority', 'position', 'dueDate'])
const UPDATABLE_FIELDS = new Set(['title', 'description', 'priority', 'position', 'dueDate', 'boardId'])

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

function fail(message) {
  throw new AppError(message, 400, 'VALIDATION_ERROR')
}

function requireString(value, fieldName) {
  if (typeof value !== 'string') {
    fail(`${fieldName} must be a string`)
  }
  return value
}

function rejectUnsupportedFields(body, allowedFields, contextMessage) {
  const unsupported = Object.keys(body).filter((key) => !allowedFields.has(key))
  if (unsupported.length === 0) {
    return
  }
  if (unsupported.includes('status')) {
    fail(
      "task status is represented by which board a task belongs to (this project's boards are its workflow stages), not a separate 'status' field — move the task to a different board instead",
    )
  }
  fail(`${contextMessage}: ${unsupported.join(', ')}`)
}

function validatePriority(value) {
  if (typeof value !== 'string' || !TASK_PRIORITIES.has(value)) {
    fail('priority must be one of: LOW, MEDIUM, HIGH, URGENT')
  }
  return value
}

// Tasks are ordered by this value ascending (within a board), so it must
// be a plain non-negative integer — same rule as board.validator.js's
// position check.
function validatePosition(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    fail('position must be a non-negative integer')
  }
  return value
}

// null explicitly clears an existing due date; any other non-date-string
// value is rejected rather than silently coerced.
function validateDueDate(value) {
  if (value === null) {
    return null
  }
  if (typeof value !== 'string') {
    fail('dueDate must be an ISO 8601 date string or null')
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    fail('dueDate must be a valid date')
  }
  return parsed
}

export function validateCreateTaskInput(body = {}) {
  rejectUnsupportedFields(body, CREATABLE_FIELDS, 'The following field(s) are not supported')

  const title = requireString(body.title, 'title').trim()
  if (title.length === 0) {
    fail('title is required')
  }
  if (title.length > TITLE_MAX_LENGTH) {
    fail(`title must be at most ${TITLE_MAX_LENGTH} characters`)
  }

  const input = { title }

  if ('description' in body && body.description !== null) {
    const rawDescription = requireString(body.description, 'description').trim()
    if (rawDescription.length > DESCRIPTION_MAX_LENGTH) {
      fail(`description must be at most ${DESCRIPTION_MAX_LENGTH} characters`)
    }
    input.description = rawDescription.length === 0 ? null : rawDescription
  }

  if ('priority' in body) {
    input.priority = validatePriority(body.priority)
  }

  // Omitted entirely when not supplied — the service determines the next
  // position automatically, so the caller never has to calculate it.
  if ('position' in body) {
    input.position = validatePosition(body.position)
  }

  if ('dueDate' in body) {
    input.dueDate = validateDueDate(body.dueDate)
  }

  return input
}

// Partial update — only fields actually present in the body end up in the
// returned object, so passing it straight to Prisma's `data` never
// overwrites an untouched field.
export function validateUpdateTaskInput(body = {}) {
  const keys = Object.keys(body)
  if (keys.length === 0) {
    fail('Request body must include at least one field to update')
  }

  rejectUnsupportedFields(body, UPDATABLE_FIELDS, 'The following field(s) cannot be updated here')

  const update = {}

  if ('title' in body) {
    const title = requireString(body.title, 'title').trim()
    if (title.length === 0) {
      fail('title cannot be empty')
    }
    if (title.length > TITLE_MAX_LENGTH) {
      fail(`title must be at most ${TITLE_MAX_LENGTH} characters`)
    }
    update.title = title
  }

  if ('description' in body) {
    if (body.description === null) {
      update.description = null
    } else {
      const rawDescription = requireString(body.description, 'description').trim()
      if (rawDescription.length > DESCRIPTION_MAX_LENGTH) {
        fail(`description must be at most ${DESCRIPTION_MAX_LENGTH} characters`)
      }
      update.description = rawDescription.length === 0 ? null : rawDescription
    }
  }

  if ('priority' in body) {
    update.priority = validatePriority(body.priority)
  }

  if ('position' in body) {
    update.position = validatePosition(body.position)
  }

  if ('dueDate' in body) {
    update.dueDate = validateDueDate(body.dueDate)
  }

  if ('boardId' in body) {
    if (typeof body.boardId !== 'string' || !UUID_REGEX.test(body.boardId)) {
      fail('boardId must be a valid board id')
    }
    update.boardId = body.boardId
  }

  return update
}

// Accepts only a plain positive integer string — undefined falls back to
// defaultValue. Same helper shape used by project/profile list pagination.
function parsePositiveInt(rawValue, fieldName, { defaultValue, max } = {}) {
  if (rawValue === undefined) {
    return defaultValue
  }
  if (!/^[1-9][0-9]*$/.test(String(rawValue))) {
    fail(`${fieldName} must be a positive integer`)
  }
  const parsed = Number(rawValue)
  if (max !== undefined && parsed > max) {
    fail(`${fieldName} must be at most ${max}`)
  }
  return parsed
}

export function validateListTasksQuery(query = {}) {
  const page = parsePositiveInt(query.page, 'page', { defaultValue: DEFAULT_PAGE })
  const limit = parsePositiveInt(query.limit, 'limit', { defaultValue: DEFAULT_LIMIT, max: MAX_LIMIT })
  return { page, limit }
}

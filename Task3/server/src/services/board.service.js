import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'
import { toBoardSummary } from '../utils/board.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const BOARD_SELECT = {
  id: true,
  projectId: true,
  name: true,
  position: true,
  createdAt: true,
  updatedAt: true,
}

function boardNotFoundError() {
  return new AppError('Board not found', 404, 'BOARD_NOT_FOUND')
}

// A board id that belongs to a different project must behave exactly like
// a nonexistent board — the same 404, no distinguishing detail — so a
// board can never be reached (or modified) through the wrong project's
// URL. Checked here, once, and used by every read/write below rather than
// only the detail route, so PATCH/DELETE can't be used to reach across
// projects either. Exported so requireBoardInProject (Phase 8's
// board-auth middleware, gating every nested task route) can reuse this
// exact check instead of duplicating the same query.
export async function getBoardWithinProject(projectId, boardId) {
  if (!UUID_REGEX.test(boardId)) {
    // A malformed id can never match a real board — treated as "not
    // found" rather than a validation error, consistent with how
    // requireProjectMember treats a malformed :projectId.
    throw boardNotFoundError()
  }

  const board = await prisma.board.findUnique({ where: { id: boardId }, select: BOARD_SELECT })
  if (!board || board.projectId !== projectId) {
    throw boardNotFoundError()
  }
  return board
}

async function nextPosition(projectId) {
  const result = await prisma.board.aggregate({
    where: { projectId },
    _max: { position: true },
  })
  return (result._max.position ?? -1) + 1
}

// projectId always comes from the URL (the caller), never a body field —
// see board.validator.js's field whitelist — so a board can't be created
// under a different project than the one its route says it's in.
export async function createBoard(projectId, { name, position }) {
  const resolvedPosition = position ?? (await nextPosition(projectId))

  const board = await prisma.board.create({
    data: { projectId, name, position: resolvedPosition },
    select: BOARD_SELECT,
  })
  return toBoardSummary(board)
}

// Ordered by position, with createdAt as a tiebreaker for full
// determinism if two boards ever share a position value (Phase 7
// deliberately doesn't implement reordering/renumbering, so nothing
// prevents that from happening).
export async function listBoards(projectId) {
  const boards = await prisma.board.findMany({
    where: { projectId },
    select: BOARD_SELECT,
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  })
  return boards.map(toBoardSummary)
}

export async function getBoard(projectId, boardId) {
  const board = await getBoardWithinProject(projectId, boardId)
  return toBoardSummary(board)
}

export async function updateBoard(projectId, boardId, update) {
  await getBoardWithinProject(projectId, boardId)

  const board = await prisma.board.update({
    where: { id: boardId },
    data: update,
    select: BOARD_SELECT,
  })
  return toBoardSummary(board)
}

export async function deleteBoard(projectId, boardId) {
  await getBoardWithinProject(projectId, boardId)

  // Task.board is declared onDelete: Cascade in schema.prisma — any tasks
  // filed under this board would be deleted along with it. Phase 8 hasn't
  // introduced task creation yet, so no Task row can currently reference
  // any board; this is documented here so the cascade isn't a surprise
  // once task creation exists.
  await prisma.board.delete({ where: { id: boardId } })
}

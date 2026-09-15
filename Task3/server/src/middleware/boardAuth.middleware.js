import { getBoardWithinProject } from '../services/board.service.js'

// Looks up :boardId and confirms it belongs to the already-verified
// :projectId (req.projectMembership, set by requireProjectMember earlier
// in the chain) — attaches req.board = { id, projectId } for every nested
// task route. Mirrors requireProjectMember's own pattern: establish one
// fact by querying the database, never by trusting the URL alone.
//
// Reuses board.service.js's getBoardWithinProject rather than duplicating
// its query — that function already throws the correct 404 (identical
// whether the board is missing or belongs to a different project) and is
// also used directly by board.controller.js's own detail/update/delete
// handlers.
export function requireBoardInProject() {
  return async function requireBoardInProjectMiddleware(req, res, next) {
    try {
      const board = await getBoardWithinProject(req.projectMembership.projectId, req.params.boardId)
      req.board = { id: board.id, projectId: board.projectId }
      next()
    } catch (error) {
      next(error)
    }
  }
}

import { getTaskWithinBoard } from '../services/task.service.js'

// Looks up :taskId and confirms it belongs to the already-verified
// :boardId (req.board, set by requireBoardInProject earlier in the chain)
// — attaches req.task = { id, boardId, projectId } for every nested
// assignee route. Mirrors requireBoardInProject's own pattern one level
// deeper: establish one fact by querying the database, never by trusting
// the URL alone.
//
// Reuses task.service.js's getTaskWithinBoard rather than duplicating its
// query — that function already throws the correct 404 (identical
// whether the task is missing or belongs to a different board) and is
// also used directly by task.controller.js's own detail/update/delete
// handlers.
export function requireTaskInBoard() {
  return async function requireTaskInBoardMiddleware(req, res, next) {
    try {
      const task = await getTaskWithinBoard(req.board.id, req.params.taskId)
      req.task = { id: task.id, boardId: task.boardId, projectId: task.projectId }
      next()
    } catch (error) {
      next(error)
    }
  }
}

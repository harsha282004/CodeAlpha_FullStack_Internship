import { validateCreateBoardInput, validateUpdateBoardInput } from '../validators/board.validator.js'
import { createBoard, listBoards, getBoard, updateBoard, deleteBoard } from '../services/board.service.js'

export async function createBoardController(req, res) {
  const input = validateCreateBoardInput(req.body)
  const board = await createBoard(req.projectMembership.projectId, input)
  res.status(201).json({ success: true, data: { board } })
}

export async function listBoardsController(req, res) {
  const boards = await listBoards(req.projectMembership.projectId)
  res.status(200).json({ success: true, data: { boards } })
}

export async function getBoardController(req, res) {
  const board = await getBoard(req.projectMembership.projectId, req.params.boardId)
  res.status(200).json({ success: true, data: { board } })
}

export async function updateBoardController(req, res) {
  const update = validateUpdateBoardInput(req.body)
  const board = await updateBoard(req.projectMembership.projectId, req.params.boardId, update)
  res.status(200).json({ success: true, data: { board } })
}

export async function deleteBoardController(req, res) {
  await deleteBoard(req.projectMembership.projectId, req.params.boardId)
  res.status(200).json({ success: true, message: 'Board deleted' })
}

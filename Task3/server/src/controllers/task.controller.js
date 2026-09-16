import { validateCreateTaskInput, validateUpdateTaskInput, validateListTasksQuery } from '../validators/task.validator.js'
import { createTask, listTasks, getTask, updateTask, deleteTask } from '../services/task.service.js'

export async function createTaskController(req, res) {
  const input = validateCreateTaskInput(req.body)
  const task = await createTask(req.board.projectId, req.board.id, req.user.id, input)
  res.status(201).json({ success: true, data: { task } })
}

export async function listTasksController(req, res) {
  const query = validateListTasksQuery(req.query)
  const result = await listTasks(req.board.id, query)
  res.status(200).json({ success: true, data: result })
}

export async function getTaskController(req, res) {
  const task = await getTask(req.board.id, req.params.taskId)
  res.status(200).json({ success: true, data: { task } })
}

export async function updateTaskController(req, res) {
  const update = validateUpdateTaskInput(req.body)
  const task = await updateTask(req.board.id, req.params.taskId, req.user.id, update)
  res.status(200).json({ success: true, data: { task } })
}

export async function deleteTaskController(req, res) {
  await deleteTask(req.board.id, req.params.taskId)
  res.status(200).json({ success: true, message: 'Task deleted' })
}

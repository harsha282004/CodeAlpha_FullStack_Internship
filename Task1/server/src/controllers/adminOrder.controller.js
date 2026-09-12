import { getAllOrdersAdmin, updateOrderStatusAdmin, serializeOrderAdmin } from '../services/order.service.js'

export async function getAllOrders(req, res, next) {
  try {
    const orders = await getAllOrdersAdmin()
    res.json({ orders: orders.map(serializeOrderAdmin) })
  } catch (error) {
    next(error)
  }
}

export async function putOrderStatus(req, res, next) {
  try {
    const { status } = req.body ?? {}
    const order = await updateOrderStatusAdmin(req.params.id, status)
    res.json({ order: serializeOrderAdmin(order) })
  } catch (error) {
    next(error)
  }
}

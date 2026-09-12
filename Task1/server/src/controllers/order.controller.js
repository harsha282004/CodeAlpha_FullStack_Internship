import { createOrder, getOrdersForUser, getOrderById, serializeOrder } from '../services/order.service.js'
import { AppError } from '../utils/AppError.js'
import { isValidUuid, isValidPostalCode, isPositiveInteger } from '../utils/validate.js'

const REQUIRED_ADDRESS_FIELDS = ['fullName', 'addressLine1', 'city', 'state', 'postalCode', 'country']

// Whitelists shipping address fields into a plain object - request bodies can
// never inject unexpected fields into what gets stored.
function buildShippingAddress(input) {
  if (!input || typeof input !== 'object') {
    throw new AppError('Shipping address is required', 400)
  }

  const address = {}

  for (const field of REQUIRED_ADDRESS_FIELDS) {
    const value = input[field]
    if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 200) {
      throw new AppError(`Shipping ${field} is required`, 400)
    }
    address[field] = value.trim()
  }

  if (!isValidPostalCode(address.postalCode)) {
    throw new AppError('Postal code is not valid', 400)
  }

  if (typeof input.addressLine2 === 'string' && input.addressLine2.trim().length > 0) {
    if (input.addressLine2.trim().length > 200) {
      throw new AppError('Address line 2 is too long', 400)
    }
    address.addressLine2 = input.addressLine2.trim()
  }

  return address
}

// Whitelists order items into { productId, quantity } pairs only - never
// trusts a client-supplied price, name, or stock value.
function buildOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('At least one item is required', 400)
  }

  return items.map((item) => {
    if (!item || !isValidUuid(item.productId)) {
      throw new AppError('Each item must have a valid productId', 400)
    }
    if (!isPositiveInteger(item.quantity)) {
      throw new AppError('Each item quantity must be a positive integer', 400)
    }
    return { productId: item.productId, quantity: item.quantity }
  })
}

export async function postOrder(req, res, next) {
  try {
    const shippingAddress = buildShippingAddress(req.body?.shippingAddress)
    const items = buildOrderItems(req.body?.items)

    const order = await createOrder(req.user.id, { shippingAddress, items })
    res.status(201).json({ order: serializeOrder(order) })
  } catch (error) {
    next(error)
  }
}

export async function getOrders(req, res, next) {
  try {
    const orders = await getOrdersForUser(req.user.id)
    res.json({ orders: orders.map(serializeOrder) })
  } catch (error) {
    next(error)
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await getOrderById(req.user.id, req.params.id)
    res.json({ order: serializeOrder(order) })
  } catch (error) {
    next(error)
  }
}

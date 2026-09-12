import { useEffect, useMemo, useState } from 'react'
import { CartContext } from './cartContext.js'

const CART_STORAGE_KEY = 'shopsphere_cart'

function isValidCartItem(item) {
  return (
    item &&
    typeof item.productId === 'string' &&
    typeof item.slug === 'string' &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    typeof item.quantity === 'number' &&
    item.quantity > 0
  )
}

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidCartItem)
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // localStorage may be unavailable (private browsing, quota exceeded) - cart just won't persist
    }
  }, [items])

  function addItem(product, requestedQuantity = 1) {
    let outcome

    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      const currentQuantity = existing?.quantity ?? 0
      const maxAddable = Math.max(product.stock - currentQuantity, 0)
      const quantityToAdd = Math.min(requestedQuantity, maxAddable)

      if (quantityToAdd <= 0) {
        outcome = { status: 'out-of-stock' }
        return prev
      }

      outcome =
        quantityToAdd < requestedQuantity
          ? { status: 'clamped', added: quantityToAdd }
          : { status: 'added', added: quantityToAdd }

      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantityToAdd, stock: product.stock }
            : item,
        )
      }

      return [
        ...prev,
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: Number(product.price),
          imageUrl: product.imageUrl,
          quantity: quantityToAdd,
          stock: product.stock,
        },
      ]
    })

    return outcome
  }

  function updateQuantity(productId, quantity) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item
        const upperBound = Math.max(item.stock, 1)
        const clamped = Math.min(Math.max(Math.trunc(quantity) || 1, 1), upperBound)
        return { ...item, quantity: clamped }
      }),
    )
  }

  function removeItem(productId) {
    setItems((prev) => prev.filter((item) => item.productId !== productId))
  }

  function clearCart() {
    setItems([])
  }

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
  const totalPrice = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items])

  const value = {
    items,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    totalItems,
    totalPrice,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

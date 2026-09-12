export const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">' +
      '<rect width="400" height="400" fill="#e2e8f0"/>' +
      '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#94a3b8">No Image</text>' +
      '</svg>',
  )

export function handleImageError(event) {
  event.currentTarget.onerror = null
  event.currentTarget.src = FALLBACK_IMAGE
}

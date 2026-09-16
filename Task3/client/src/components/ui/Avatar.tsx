interface AvatarProps {
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-12 w-12 text-base',
}

const PALETTE = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
]

function colorFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

// A real photo when the profile has one; otherwise a deterministic
// initials avatar derived from the user's own name — never a placeholder
// stock image or fabricated identity.
export function Avatar({ name, avatarUrl, size = 'md' }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${SIZE_CLASSES[size]} shrink-0 rounded-full object-cover`}
      />
    )
  }

  return (
    <span
      role="img"
      aria-label={name}
      className={`${SIZE_CLASSES[size]} flex shrink-0 items-center justify-center rounded-full font-semibold ${colorFor(name)}`}
    >
      {initials || '?'}
    </span>
  )
}

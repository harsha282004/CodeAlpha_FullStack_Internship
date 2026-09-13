import { useState } from 'react'
import { getInitials } from '../../lib/format'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
}

// Decorative by design (alt=""): every place this is used also renders the
// person's name as adjacent text, so a screen reader announcing it twice
// would be redundant noise rather than useful information.
export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/25 to-accent/20 font-semibold text-primary ring-1 ring-inset ring-border ${SIZE_CLASSES[size]} ${className}`}
    >
      {showImage ? (
        <img src={src ?? undefined} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </span>
  )
}

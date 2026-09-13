import { forwardRef, type ButtonHTMLAttributes } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, active = false, className = '', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? 'text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})

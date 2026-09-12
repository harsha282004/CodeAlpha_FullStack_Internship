const SIZE_CLASSES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
}

const TONE_CLASSES = {
  dark: 'border-slate-300 border-t-slate-900',
  light: 'border-white/30 border-t-white',
}

export default function Spinner({ size = 'md', tone = 'dark', className = '' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

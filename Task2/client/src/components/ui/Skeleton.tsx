export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-shimmer rounded-md ${className}`} aria-hidden="true" />
}

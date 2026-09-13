import { Skeleton } from '../ui/Skeleton'

export function PostCardSkeleton() {
  return (
    <div className="border-b border-border px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-16" />
          </div>
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
          <div className="flex gap-3 pt-1">
            <Skeleton className="h-7 w-14 rounded-full" />
            <Skeleton className="h-7 w-14 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

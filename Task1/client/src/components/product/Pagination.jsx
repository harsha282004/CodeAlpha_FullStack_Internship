import Button from '../ui/Button.jsx'

export default function Pagination({ page, totalPages, total, onPrevious, onNext }) {
  if (totalPages <= 1) return null

  return (
    <div className="flex flex-col items-center justify-center gap-2 pt-4 sm:flex-row sm:gap-4">
      <Button variant="secondary" onClick={onPrevious} disabled={page <= 1}>
        Previous
      </Button>
      <span className="text-sm text-slate-600">
        Page {page} of {totalPages}
        {typeof total === 'number' && <span className="text-slate-400"> &middot; {total} results</span>}
      </span>
      <Button variant="secondary" onClick={onNext} disabled={page >= totalPages}>
        Next
      </Button>
    </div>
  )
}

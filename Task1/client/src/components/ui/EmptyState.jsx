export default function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
      <h3 className="text-lg font-medium text-slate-800">{title}</h3>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action}
    </div>
  )
}

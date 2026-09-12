export default function ErrorState({ title = 'Something went wrong', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <h3 className="text-lg font-medium text-red-800">{title}</h3>
      {description && <p className="max-w-sm text-sm text-red-600">{description}</p>}
      {action}
    </div>
  )
}

export default function PlaceholderPage({ title, description }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
      <p className="mt-3 text-slate-500">{description}</p>
    </div>
  )
}

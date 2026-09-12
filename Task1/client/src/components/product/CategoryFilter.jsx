export default function CategoryFilter({ categories, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
      <button
        type="button"
        onClick={() => onChange('')}
        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
          value === ''
            ? 'border-slate-900 bg-slate-900 text-white'
            : 'border-slate-300 text-slate-600 hover:bg-slate-100'
        }`}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onChange(category)}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
            value === category
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-300 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} ShopSphere. Built as a full stack e-commerce learning project.</p>
      </div>
    </footer>
  )
}

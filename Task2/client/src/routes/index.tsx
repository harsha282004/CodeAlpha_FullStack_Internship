import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gray-50 text-center">
      <h1 className="text-4xl font-bold text-gray-900">Connectly</h1>
      <p className="text-lg text-gray-600">Social Media Platform</p>
      <p className="text-sm text-gray-400">CodeAlpha Task 2</p>
    </main>
  )
}

import { useEffect, useState } from 'react'
import { getApiHealth, getDatabaseHealth } from '../lib/api'

type CheckState = 'idle' | 'loading' | 'ok' | 'error'

// Foundation-phase hook: proves the frontend can reach the Express API (and,
// transitively, Postgres via Prisma). Superseded by real data-fetching hooks
// once projects/boards/tasks endpoints exist.
export function useHealthCheck() {
  const [apiStatus, setApiStatus] = useState<CheckState>('idle')
  const [dbStatus, setDbStatus] = useState<CheckState>('idle')

  useEffect(() => {
    let cancelled = false

    setApiStatus('loading')
    getApiHealth()
      .then(() => {
        if (!cancelled) setApiStatus('ok')
      })
      .catch(() => {
        if (!cancelled) setApiStatus('error')
      })

    setDbStatus('loading')
    getDatabaseHealth()
      .then(() => {
        if (!cancelled) setDbStatus('ok')
      })
      .catch(() => {
        if (!cancelled) setDbStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { apiStatus, dbStatus }
}

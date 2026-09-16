import { useEffect, useState } from 'react'
import { healthApi } from '../lib/api'

type CheckState = 'idle' | 'loading' | 'ok' | 'error'

// Proves the frontend can reach the Express API (and, transitively,
// Postgres via Prisma). Used as a small, honest "system status" indicator
// on the landing page — real data, never a fabricated uptime number.
export function useHealthCheck() {
  const [apiStatus, setApiStatus] = useState<CheckState>('idle')
  const [dbStatus, setDbStatus] = useState<CheckState>('idle')

  useEffect(() => {
    let cancelled = false

    setApiStatus('loading')
    healthApi
      .api()
      .then(() => {
        if (!cancelled) setApiStatus('ok')
      })
      .catch(() => {
        if (!cancelled) setApiStatus('error')
      })

    setDbStatus('loading')
    healthApi
      .db()
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

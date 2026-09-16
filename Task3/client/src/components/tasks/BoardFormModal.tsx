import { useState, type FormEvent } from 'react'
import { ApiError } from '../../lib/api'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { InputField } from '../ui/FormField'

interface BoardFormModalProps {
  open: boolean
  title: string
  initialName?: string
  onClose: () => void
  onSubmit: (name: string) => Promise<unknown>
}

// Shared by "create board" and "rename board" — both are just "one name
// field, submit" (see board.validator.js: name and optional position are
// the only fields a board has).
export function BoardFormModal({ open, title, initialName = '', onClose, onSubmit }: BoardFormModalProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Board name is required.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onSubmit(name.trim())
      onClose()
      setName('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Board name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          placeholder="e.g. To Do, In Progress, Done"
          autoFocus
          required
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}

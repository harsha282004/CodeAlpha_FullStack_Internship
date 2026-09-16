import { useState, type FormEvent } from 'react'
import { ApiError, type CreateProjectInput } from '../../lib/api'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { InputField, TextareaField } from '../ui/FormField'

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: CreateProjectInput) => Promise<unknown>
}

export function CreateProjectModal({ open, onClose, onSubmit }: CreateProjectModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Project name is required.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onSubmit({ name: name.trim(), description: description.trim() || null })
      onClose()
      setName('')
      setDescription('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          autoFocus
          required
        />
        <TextareaField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  )
}

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

interface FieldWrapperProps {
  label: string
  error?: string | null
  hint?: string
  children: (id: string, describedBy: string | undefined) => ReactNode
}

// Shared label/error/hint layout for every form control in the app —
// guarantees every input has a real associated <label> (via htmlFor/id)
// and that a validation error is wired up with aria-describedby, not just
// colored text next to the field.
function FieldWrapper({ label, error, hint, children }: FieldWrapperProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

const inputClasses = (hasError: boolean) =>
  `block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-500 ${
    hasError ? 'border-red-400' : 'border-slate-300'
  }`

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | null
  hint?: string
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  { label, error, hint, className = '', ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      {(id, describedBy) => (
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`${inputClasses(!!error)} ${className}`}
          {...rest}
        />
      )}
    </FieldWrapper>
  )
})

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string | null
  hint?: string
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  { label, error, hint, className = '', ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      {(id, describedBy) => (
        <textarea
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`${inputClasses(!!error)} resize-y ${className}`}
          {...rest}
        />
      )}
    </FieldWrapper>
  )
})

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string | null
  hint?: string
  children: ReactNode
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, className = '', children, ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      {(id, describedBy) => (
        <select
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`${inputClasses(!!error)} bg-white ${className}`}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldWrapper>
  )
})

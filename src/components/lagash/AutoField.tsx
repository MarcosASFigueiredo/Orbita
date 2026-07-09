import { useEffect, useRef, useState } from 'react'

interface AutoFieldProps {
  label: string
  value: string
  onSave: (value: string) => void | Promise<void>
  multiline?: boolean
  disabled?: boolean
  placeholder?: string
  italic?: boolean
}

// A labelled input/textarea that saves on blur (only when changed). While the
// field is focused it ignores upstream value changes (e.g. a realtime refetch)
// so it never clobbers what the user is typing.
export function AutoField({
  label,
  value,
  onSave,
  multiline = false,
  disabled = false,
  placeholder,
  italic = false,
}: AutoFieldProps) {
  const [draft, setDraft] = useState(value)
  const savedRef = useRef(value)
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current && value !== savedRef.current) {
      savedRef.current = value
      setDraft(value)
    }
  }, [value])

  const commit = () => {
    focusedRef.current = false
    if (draft !== savedRef.current) {
      savedRef.current = draft
      void onSave(draft)
    }
  }

  const shared = {
    value: draft,
    disabled,
    placeholder,
    onFocus: () => {
      focusedRef.current = true
    },
    onBlur: commit,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    className: `field-${multiline ? 'textarea' : 'input'}${italic ? ' italic' : ''}`,
  }

  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {multiline ? <textarea rows={3} {...shared} /> : <input type="text" {...shared} />}
    </label>
  )
}

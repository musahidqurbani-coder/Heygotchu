interface DatePickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  min?: string
  error?: string
}

export default function DatePicker({ label, value, onChange, min, error }: DatePickerProps) {
  const id = `date-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink/70">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-2xl border bg-white px-4 py-3.5 text-base shadow-sm outline-none transition focus:ring-2 focus:ring-coral ${
          error ? 'border-coral' : 'border-black/10'
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-coral">
          {error}
        </p>
      )}
    </div>
  )
}

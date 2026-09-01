interface GenerateButtonProps {
  onClick: () => void
  disabled?: boolean
  label?: string
}

export default function GenerateButton({ onClick, disabled, label = 'Create My Palette' }: GenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative w-full overflow-hidden rounded-2xl px-6 py-4 text-base font-semibold text-[#fff] shadow-lg transition-transform duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coral disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-10"
      style={{ background: 'linear-gradient(135deg, #ff6b5e, #ff9b54)' }}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        ✨ {label}
      </span>
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[#fff]/20 transition-transform duration-500 ease-out group-hover:translate-x-full" />
    </button>
  )
}

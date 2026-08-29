interface SaveTripButtonProps {
  saved: boolean
  onClick: () => void
}

export default function SaveTripButton({ saved, onClick }: SaveTripButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-coral active:scale-95 ${
        saved ? 'bg-mint/20 text-mint' : 'bg-ink text-white hover:opacity-90'
      }`}
      aria-pressed={saved}
    >
      <span aria-hidden="true">{saved ? '✓' : '💾'}</span>
      {saved ? 'Saved' : 'Save Trip'}
    </button>
  )
}

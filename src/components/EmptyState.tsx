interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon = '✨', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-black/10 bg-white/60 px-6 py-12 text-center">
      <span className="text-4xl">{icon}</span>
      <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-ink/60">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

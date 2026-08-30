interface PackedBagPreviewProps {
  photos: string[] // items shown in the current day's strip
}

// A static recreation of the real "fit deck" screen (bag meter + day chips +
// clothes strip + Pack it button) — exactly what someone sees in the app
// after saving and packing a bag, not a lifestyle stock photo.
export default function PackedBagPreview({ photos }: PackedBagPreviewProps) {
  const packed = 4
  const total = 5
  const pct = Math.round((packed / total) * 100)

  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-black/10">
      <div className="overflow-hidden rounded-xl ring-1 ring-black/10">
        <div className="h-4 bg-mint/70" style={{ width: `${pct}%` }} />
        <div className="flex justify-between bg-cloud px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-ink/50">
          <span>{packed} of {total} fits packed</span>
          <span>{pct}%</span>
        </div>
      </div>

      <div className="mt-2 flex gap-1.5 overflow-x-auto">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              i < packed
                ? 'bg-mint/25 text-ink/70 ring-1 ring-mint'
                : i === packed
                  ? 'bg-ink text-white'
                  : 'bg-cloud text-ink/50 ring-1 ring-black/10'
            }`}
          >
            Day {i + 1}{i < packed ? ' ✓' : ''}
          </span>
        ))}
      </div>

      <div className="mt-2 flex gap-1.5">
        {photos.map((src, i) => (
          <img key={i} src={src} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-black/10" />
        ))}
      </div>

      <div className="mt-2 flex gap-1.5">
        <span className="flex-1 rounded-full bg-white px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-ink/60 ring-2 ring-ink/70">✕ Nah</span>
        <span className="flex-1 rounded-full bg-sun px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-ink ring-2 ring-ink/70">↻ Remix</span>
        <span className="flex-1 rounded-full bg-ink px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-white ring-2 ring-ink">✓ Pack it</span>
      </div>
    </div>
  )
}

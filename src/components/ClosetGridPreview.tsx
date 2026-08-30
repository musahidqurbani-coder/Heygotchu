interface ClosetPreviewItem {
  photo: string
  name: string
  meta: string // "Category · Warmth", matching the real closet card format
}

// A small recreation of the real "My Closet" grid — same card shape as
// ClothingItemCard — populated with real garment photos, so "Snap your
// closet" shows what the app's closet actually looks like once populated.
export default function ClosetGridPreview({ items }: { items: ClosetPreviewItem[] }) {
  return (
    <div className="rounded-2xl bg-cloud/60 p-3">
      <div className="grid grid-cols-4 gap-2">
        {items.map((item, i) => (
          <div key={i} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="aspect-square bg-cloud">
              <img src={item.photo} alt={item.name} className="h-full w-full object-cover" />
            </div>
            <div className="px-1.5 py-1.5">
              <p className="truncate text-[10px] font-semibold text-ink">{item.name}</p>
              <p className="truncate text-[9px] text-ink/45">{item.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

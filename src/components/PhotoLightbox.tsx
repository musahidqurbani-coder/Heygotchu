import { useEffect, useState } from 'react'

interface PhotoLightboxProps {
  src: string
  alt?: string
  onClose: () => void
}

// Full-screen viewer for item photos/crops: opens fitted to the screen,
// tapping the image toggles a 2.4x zoom you can pan by scrolling, tapping
// the backdrop (or Escape) closes.
export default function PhotoLightbox({ src, alt, onClose }: PhotoLightboxProps) {
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt ?? 'Photo'}
      className="fixed inset-0 z-[70] bg-[#000]/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-[#fff]/15 text-lg text-[#fff] backdrop-blur transition hover:bg-[#fff]/30"
      >
        ✕
      </button>

      <div
        className={`h-full w-full ${zoomed ? 'overflow-auto' : 'flex items-center justify-center p-4'}`}
        onClick={(e) => {
          // Clicks on the padding around a fitted image close; clicks on the
          // scroll area while zoomed shouldn't.
          if (zoomed) e.stopPropagation()
        }}
      >
        <img
          src={src}
          alt={alt ?? ''}
          onClick={(e) => {
            e.stopPropagation()
            setZoomed((z) => !z)
          }}
          className={
            zoomed
              ? 'w-[240%] max-w-none cursor-zoom-out sm:w-[170%]'
              : 'max-h-full max-w-full cursor-zoom-in rounded-2xl object-contain shadow-2xl'
          }
        />
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs font-medium text-[#fff]/70">
        {zoomed ? 'Scroll to pan · tap the photo to fit' : 'Tap the photo to zoom · tap outside to close'}
      </p>
    </div>
  )
}

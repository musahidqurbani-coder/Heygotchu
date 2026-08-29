interface ToastProps {
  message: string | null
}

export default function Toast({ message }: ToastProps) {
  if (!message) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <div className="animate-pop-in rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-xl">
        {message}
      </div>
    </div>
  )
}

interface ColorSwatchProps {
  hex: string
  name: string
}

export function ColorSwatch({ hex, name }: ColorSwatchProps) {
  return (
    <div className="group flex flex-col items-center gap-2 text-center">
      <div
        className="h-16 w-16 rounded-2xl shadow-sm ring-1 ring-black/5 transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:shadow-lg sm:h-20 sm:w-20"
        style={{ backgroundColor: hex }}
        aria-hidden="true"
      />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{name}</p>
        <p className="font-mono text-sm text-ink/80">{hex.toUpperCase()}</p>
      </div>
    </div>
  )
}

interface PaletteStripProps {
  colors: { hex: string; name: string }[]
}

export default function PaletteStrip({ colors }: PaletteStripProps) {
  return (
    <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
      {colors.map((c) => (
        <ColorSwatch key={c.hex} hex={c.hex} name={c.name} />
      ))}
    </div>
  )
}

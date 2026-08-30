import type { AvatarLook } from '../types'

export interface AvatarGarment {
  id: string
  name: string
  category: string
  color: string
  photo?: string
}

interface AvatarFigureProps {
  look?: AvatarLook
  items: AvatarGarment[]
  height?: number // px height of the whole figure
}

const DEFAULT_LOOK: AvatarLook = { skinHex: '#e8b98f', hairHex: '#5a4632', hairstyle: 'medium' }

// Garment placement zones as percentages of the figure box. Real cropped
// photos are layered onto the illustrated body, paper-doll style.
const ZONES: Record<string, { top: number; left: number; width: number; height: number; z: number; round: number }> = {
  dress: { top: 24, left: 21, width: 58, height: 47, z: 3, round: 14 },
  swimwear: { top: 24, left: 24, width: 52, height: 42, z: 3, round: 14 },
  top: { top: 24, left: 23, width: 54, height: 26, z: 4, round: 12 },
  outerwear: { top: 23, left: 14, width: 72, height: 30, z: 5, round: 12 },
  bottom: { top: 48, left: 27, width: 46, height: 33, z: 3, round: 12 },
  footwear: { top: 86, left: 30, width: 40, height: 11, z: 4, round: 8 },
  accessory: { top: 6, left: 71, width: 27, height: 15, z: 6, round: 10 },
}

function Hair({ look }: { look: AvatarLook }) {
  const h = look.hairHex
  switch (look.hairstyle) {
    case 'bald':
      return null
    case 'hijab':
      return (
        <>
          <path d="M96 88 C96 38 204 38 204 88 L204 118 C204 146 96 146 96 118 Z" fill={h} />
          <path d="M96 95 C80 130 86 160 104 176 L124 150 C110 132 104 114 106 98 Z" fill={h} />
          <path d="M204 95 C220 130 214 160 196 176 L176 150 C190 132 196 114 194 98 Z" fill={h} />
        </>
      )
    case 'short':
      return <path d="M100 78 C100 40 200 40 200 78 L200 88 C186 62 114 62 100 88 Z" fill={h} />
    case 'medium':
      return (
        <>
          <path d="M98 80 C98 38 202 38 202 80 L202 120 L188 120 L186 78 C160 58 140 58 114 78 L112 120 L98 120 Z" fill={h} />
        </>
      )
    case 'long':
      return (
        <>
          <path d="M98 80 C98 38 202 38 202 80 L204 180 C204 196 188 196 188 180 L186 78 C160 56 140 56 114 78 L112 180 C112 196 96 196 96 180 Z" fill={h} />
        </>
      )
    case 'ponytail':
      return (
        <>
          <path d="M100 78 C100 40 200 40 200 78 L200 90 C186 62 114 62 100 90 Z" fill={h} />
          <path d="M196 70 C224 84 226 140 208 172 C200 160 198 120 190 96 Z" fill={h} />
          <circle cx="199" cy="70" r="9" fill={h} />
        </>
      )
    case 'bun':
      return (
        <>
          <path d="M100 78 C100 42 200 42 200 78 L200 88 C186 62 114 62 100 88 Z" fill={h} />
          <circle cx="150" cy="34" r="16" fill={h} />
        </>
      )
    case 'curly':
      return (
        <>
          {[110, 130, 150, 170, 190].map((x, i) => (
            <circle key={i} cx={x} cy={i % 2 ? 48 : 56} r="17" fill={h} />
          ))}
          <circle cx="102" cy="78" r="14" fill={h} />
          <circle cx="198" cy="78" r="14" fill={h} />
        </>
      )
  }
}

// The illustrated person: friendly, stylized, never a likeness. Garment
// photos from the closet are layered over it in their zones.
export default function AvatarFigure({ look = DEFAULT_LOOK, items, height = 420 }: AvatarFigureProps) {
  const skin = look.skinHex
  const hasDressLike = items.some((i) => i.category === 'dress' || i.category === 'swimwear')

  return (
    <div className="relative mx-auto" style={{ height, aspectRatio: '300 / 560' }}>
      <svg viewBox="0 0 300 560" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {/* legs */}
        <rect x="118" y="300" width="26" height="180" rx="13" fill={skin} />
        <rect x="156" y="300" width="26" height="180" rx="13" fill={skin} />
        {/* feet */}
        <ellipse cx="128" cy="492" rx="22" ry="10" fill={skin} />
        <ellipse cx="172" cy="492" rx="22" ry="10" fill={skin} />
        {/* underlayer shorts+tank so an un-dressed avatar still looks decent */}
        <path d="M112 288 L188 288 L184 336 L158 336 L150 316 L142 336 L116 336 Z" fill="#d8d2c6" />
        {/* arms */}
        <rect x="86" y="152" width="24" height="150" rx="12" fill={skin} transform="rotate(8 98 152)" />
        <rect x="190" y="152" width="24" height="150" rx="12" fill={skin} transform="rotate(-8 202 152)" />
        {/* torso */}
        <path d="M108 140 C108 128 192 128 192 140 L196 290 L104 290 Z" fill="#e3ddd0" />
        {/* neck + head */}
        <rect x="138" y="108" width="24" height="26" rx="10" fill={skin} />
        <circle cx="150" cy="82" r="44" fill={skin} />
        {/* face */}
        <circle cx="134" cy="80" r="4" fill="#3a3024" />
        <circle cx="166" cy="80" r="4" fill="#3a3024" />
        <path d="M138 98 Q150 108 162 98" stroke="#3a3024" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="124" cy="92" r="6" fill="#f3a09a" opacity="0.55" />
        <circle cx="176" cy="92" r="6" fill="#f3a09a" opacity="0.55" />
        <Hair look={look} />
      </svg>

      {items.map((item) => {
        // A top hides under a dress zone conflict; keep whichever exists.
        if (hasDressLike && item.category === 'top') return null
        const zone = ZONES[item.category]
        if (!zone) return null
        return (
          <div
            key={item.id}
            title={item.name}
            className="absolute overflow-hidden shadow-md ring-1 ring-black/10"
            style={{
              top: `${zone.top}%`,
              left: `${zone.left}%`,
              width: `${zone.width}%`,
              height: `${zone.height}%`,
              zIndex: zone.z,
              borderRadius: zone.round,
            }}
          >
            {item.photo ? (
              <img src={item.photo} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-end justify-center pb-1 text-[9px] font-semibold text-white/90"
                style={{ backgroundColor: item.color }}
              >
                {item.name.split(' ').slice(0, 2).join(' ')}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

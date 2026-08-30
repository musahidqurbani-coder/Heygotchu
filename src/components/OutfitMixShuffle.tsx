import { useState } from 'react'

interface OutfitMixShuffleProps {
  tops: string[]
  bottoms: string[]
  shoes: string[]
}

// "Pick the moment" visual: a top, a bottom, and a pair of shoes — three
// independent pools. Shuffling picks one slot to leave alone and swaps the
// other two for a different random piece, so it reads as real mix-and-match
// rather than three unrelated stock photos.
export default function OutfitMixShuffle({ tops, bottoms, shoes }: OutfitMixShuffleProps) {
  const [indices, setIndices] = useState([0, 0, 0])
  const pools = [tops, bottoms, shoes]
  const labels = ['Top', 'Bottom', 'Shoes']

  function shuffle() {
    const keep = Math.floor(Math.random() * 3)
    setIndices((prev) =>
      prev.map((cur, slot) => {
        if (slot === keep) return cur
        const pool = pools[slot]
        if (pool.length <= 1) return cur
        let next = Math.floor(Math.random() * pool.length)
        while (next === cur) next = Math.floor(Math.random() * pool.length)
        return next
      }),
    )
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {pools.map((pool, slot) => (
          <div key={labels[slot]}>
            <img
              src={pool[indices[slot]]}
              alt={labels[slot]}
              className="aspect-square w-full rounded-xl object-cover ring-1 ring-black/10"
              loading="lazy"
            />
            <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-widest text-ink/35">{labels[slot]}</p>
          </div>
        ))}
      </div>
      <button
        onClick={shuffle}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-cloud px-3 py-2 text-xs font-semibold text-ink/60 transition hover:bg-cloud/70 hover:text-ink"
      >
        <span aria-hidden="true">🔀</span> Shuffle the mix
      </button>
    </div>
  )
}

import { useState } from 'react'
import { BookOpen, Star, Sun } from 'lucide-react'

// Bottom dock for the player on small screens (< 720px). Jumps to the codex,
// the suns clock, or the legacy track. No hover-dependent interaction. Hidden
// on larger screens where everything is visible at once.
const TABS = [
  { id: 'ficha', label: 'Ficha', Icon: BookOpen },
  { id: 'sois', label: 'Sóis', Icon: Sun },
  { id: 'legado', label: 'Legado', Icon: Star },
] as const

export function MobileDock() {
  const [active, setActive] = useState<string>('ficha')

  const go = (id: string) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[55] flex justify-around border-t border-[var(--color-gold-faint)] bg-[rgba(5,5,7,0.9)] px-2 pt-2.5 backdrop-blur-lg pb-[calc(10px+env(safe-area-inset-bottom))] min-[720px]:hidden">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => go(id)}
          className={`flex flex-col items-center gap-1.5 px-2.5 py-1 text-[9px] uppercase tracking-wide transition-colors ${
            active === id ? 'text-[var(--color-gold-bright)]' : 'text-[var(--color-text-3)]'
          }`}
        >
          <Icon size={19} strokeWidth={1.5} />
          {label}
        </button>
      ))}
    </nav>
  )
}

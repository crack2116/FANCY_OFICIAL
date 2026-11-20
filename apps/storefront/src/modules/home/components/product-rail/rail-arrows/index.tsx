"use client"

import ChevronDown from "@modules/common/icons/chevron-down"

export default function RailArrows({ listId }: { listId: string }) {
  const scroll = (direction: "left" | "right") => {
    const list = document.getElementById(listId)
    if (!list) return
    const offset = direction === "left" ? -list.clientWidth * 0.75 : list.clientWidth * 0.75
    list.scrollBy({ left: offset, behavior: "smooth" })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label="Anterior"
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 hidden small:flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md text-fg-muted hover:text-fg-base hover:shadow-lg transition-all focus:outline-none"
      >
        <span className="rotate-90">
          <ChevronDown size="16" />
        </span>
      </button>

      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label="Siguiente"
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md text-fg-muted hover:text-fg-base hover:shadow-lg transition-all focus:outline-none"
      >
        <span className="-rotate-90">
          <ChevronDown size="16" />
        </span>
      </button>
    </>
  )
}

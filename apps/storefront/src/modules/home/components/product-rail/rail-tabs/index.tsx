"use client"

import React, { useCallback, useState } from "react"

import { t } from "@lib/i18n/translations"
import { clx } from "@modules/common/components/ui"

const ALL = "*"

export type RailCategory = {
  handle: string
  name: string
}

function renderTabIcon(handle: string, isActive: boolean) {
  const iconColor = isActive ? "text-white" : "text-[#0E352E]"

  if (handle === ALL) {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        className={clx("h-3.5 w-3.5 shrink-0", iconColor)}
        aria-hidden="true"
      >
        <rect x="2" y="2" width="5" height="5" rx="1.2" />
        <rect x="9" y="2" width="5" height="5" rx="1.2" />
        <rect x="2" y="9" width="5" height="5" rx="1.2" />
        <rect x="9" y="9" width="5" height="5" rx="1.2" />
      </svg>
    )
  }

  const key = handle.toLowerCase()
  if (key.includes("alimento")) {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className={clx("h-4 w-4 shrink-0", iconColor)}
        aria-hidden="true"
      >
        <path
          d="M5.5 9.5a2.2 2.2 0 0 1 2.1-1.9 2.6 2.6 0 0 1 4.8 0 2.2 2.2 0 0 1 2.1 1.9"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M3.8 10h12.4l1.2 4.8a1.2 1.2 0 0 1-1.16 1.5H3.76a1.2 1.2 0 0 1-1.16-1.5L3.8 10Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (key.includes("higiene")) {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className={clx("h-4 w-4 shrink-0", iconColor)}
        aria-hidden="true"
      >
        <path
          d="M10 3.2c3.2 3.6 5.2 6.3 5.2 9a5.2 5.2 0 0 1-10.4 0c0-2.7 2-5.4 5.2-9Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (key.includes("salud")) {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className={clx("h-4 w-4 shrink-0", iconColor)}
        aria-hidden="true"
      >
        <path
          d="M10 16.2 4.2 10.6a3.7 3.7 0 0 1 5.2-5.2L10 6l.6-.6a3.7 3.7 0 0 1 5.2 5.2L10 16.2Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (key.includes("juguete")) {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className={clx("h-4 w-4 shrink-0", iconColor)}
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="6.2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M5.5 6.5c2.8 1.2 5.5 3.6 7 8.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={clx("h-4 w-4 shrink-0", iconColor)}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export default function RailTabs({
  listId,
  label,
  categories,
}: {
  listId: string
  label: string
  categories: RailCategory[]
}) {
  const [active, setActive] = useState(ALL)

  const select = useCallback(
    (handle: string) => {
      setActive(handle)

      const list = document.getElementById(listId)

      if (!list) {
        return
      }

      for (const card of Array.from(list.children)) {
        if (card.getAttribute("data-rail-end-card") === "true") {
          card.removeAttribute("hidden")
          continue
        }
        const belongs =
          handle === ALL ||
          (card.getAttribute("data-categories") ?? "").split(" ").includes(handle)

        card.toggleAttribute("hidden", !belongs)
      }

      list.scrollLeft = 0
    },
    [listId]
  )

  const tabs = [{ handle: ALL, name: t("home.rails.allCategories") }, ...categories]

  return (
    <div
      className="no-scrollbar flex items-center gap-2.5 overflow-x-auto py-0.5"
      role="group"
      aria-label={t("home.rails.filterByCategory", { label })}
      data-testid={`product-rail-tabs-${listId}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.handle === active

        return (
          <button
            key={tab.handle}
            type="button"
            onClick={() => select(tab.handle)}
            aria-pressed={isActive}
            className={clx(
              "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-xs transition-all small:text-[13px]",
              isActive
                ? "border-[#F36F21] bg-[#F36F21] font-bold text-white shadow-[0_6px_16px_rgba(243,111,33,0.28)]"
                : "border-slate-200/90 bg-white font-semibold text-[#0E352E] shadow-2xs hover:border-[#F36F21]/50"
            )}
          >
            {renderTabIcon(tab.handle, isActive)}
            <span>{tab.name}</span>
          </button>
        )
      })}
    </div>
  )
}

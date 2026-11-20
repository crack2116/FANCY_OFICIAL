"use client"

import { useEffect, useSyncExternalStore } from "react"
import { t } from "@lib/i18n/translations"
import {
  getWishlistServerSnapshot,
  getWishlistSnapshot,
  hydrateWishlist,
  subscribeWishlist,
} from "@lib/wishlist"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Heart from "@modules/common/icons/heart"

export default function FavoritesDashboardCard() {
  const handles = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  )

  useEffect(() => {
    hydrateWishlist()
  }, [])

  const count = handles.length
  const statusLabel =
    count === 1
      ? t("account.favorites.countOne")
      : count > 1
        ? t("account.favorites.count", { count })
        : t("account.dashboard.card.favorites.empty")

  return (
    <div
      className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_24px_rgba(15,53,46,0.04)] transition-all duration-150 hover:border-[#FFD8B8] hover:shadow-[0_12px_30px_rgba(243,111,33,0.08)] flex flex-col justify-between gap-5"
      data-testid="dashboard-card-favorites"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF3E8] text-[#F36F21]">
            <Heart size="21" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#0F352E]">
              {t("account.dashboard.card.favorites.title")}
            </h2>
          </div>
        </div>
        <LocalizedClientLink
          href="/account/favorites"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFF5EB] px-3 py-1 text-xs font-semibold text-[#D85A0E] transition-colors hover:bg-[#FFE8D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F36F21]"
          data-testid="dashboard-card-favorites-link"
        >
          <span>{t("account.dashboard.action")}</span>
          <span aria-hidden="true">→</span>
        </LocalizedClientLink>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed">
        {t("account.dashboard.card.favorites.body")}
      </p>

      <div className="pt-1">
        {count > 0 ? (
          <span className="text-lg font-bold text-[#0F352E]">{statusLabel}</span>
        ) : (
          <span className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  )
}

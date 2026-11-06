import { getBranding } from "@lib/branding"
import { t } from "@lib/i18n/translations"

/**
 * Top announcement strip. Server component: no client JavaScript.
 *
 * WHY THIS READS BRANDING, NOT SITE CONFIG
 * -----------------------------------------
 * It used to read `announcement` from `site-config.ts`, which meant changing
 * that strip meant editing code and redeploying. The Admin Marca screen now
 * owns it, so the operator can turn the bar off or rewrite its copy without a
 * deploy. `site-config.ts` keeps only the shipped fallback, so a backend that
 * cannot be reached still renders something sensible.
 *
 * Messages rotate only via configuration, not via a timer, so nothing here
 * ships needless JS.
 */
export default async function AnnouncementBar() {
  const branding = await getBranding()

  const [primary, secondary] = branding.announcement_enabled
    ? branding.announcement_messages
    : []

  if (!branding.announcement_enabled || !primary) {
    return null
  }

  return (
    <div
      className="border-b border-white/10 bg-[#0e3b3a] text-[#fff8ea]"
      role="region"
      aria-label={t("announcement.label")}
    >
      <div className="site-container flex h-9 items-center justify-center overflow-hidden">
        <p className="flex min-w-0 items-center gap-2 truncate text-center text-[11px] font-medium tracking-wide xsmall:text-xs">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400"
          />
          <span className="truncate">{primary}</span>
          {secondary ? (
            <>
              <span aria-hidden="true" className="mx-1 text-brand-300">
                &bull;
              </span>
              <span className="hidden truncate text-brand-100 xsmall:inline">
                {secondary}
              </span>
            </>
          ) : null}
        </p>
      </div>
    </div>
  )
}
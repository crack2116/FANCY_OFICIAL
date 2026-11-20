import type { Benefit } from "@lib/site-config"
import { t } from "@lib/i18n/translations"

/**
 * Trust signals.
 *
 * Rendered from the shared `benefits` array in `@lib/site-config`, which the
 * footer also uses, so home and footer can never drift apart. No
 * free-shipping threshold, no delivery window, no veterinary guarantee.
 */
export default function Benefits({ benefits }: { benefits: Benefit[] }) {
  if (!benefits.length) {
    return null
  }

  return (
    <section
      aria-label={t("benefits.title")}
      className="border-y border-[var(--border-subtle)] bg-surface-subtle"
    >
      <div className="site-container grid grid-cols-1 gap-8 py-10 xsmall:grid-cols-2 medium:grid-cols-3 medium:py-14">
        {benefits.map((benefit) => (
          <div key={benefit.id} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-fg-base">
              {t(benefit.titleKey)}
            </h3>
            <p className="text-sm leading-relaxed text-fg-subtle">
              {t(benefit.descriptionKey)}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

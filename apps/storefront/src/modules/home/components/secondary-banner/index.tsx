import { t } from "@lib/i18n/translations"
import type { HomeSecondaryBanner } from "@lib/home-config"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Secondary commercial block, rendered between rails.
 *
 * Server Component driven entirely by `secondaryBanners`. Copy is commercial
 * only: no delivery promise, no discount percentage, no medical or veterinary
 * claim, since none of those are backed by data yet.
 */
export default function SecondaryBanner({
  banner,
}: {
  banner: HomeSecondaryBanner
}) {
  return (
    <section className="site-section" aria-labelledby={`${banner.id}-heading`}>
      <div className="site-container">
        <div className="relative grid items-center gap-8 overflow-hidden rounded-[1.75rem] border border-[#dbe6da] bg-[var(--surface-sage)] px-6 py-10 shadow-[var(--shadow-card)] xsmall:px-10 medium:grid-cols-2 medium:gap-14 medium:rounded-[2rem] medium:py-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/50 blur-3xl" />

          <div className="relative flex flex-col items-start gap-4">
            {banner.eyebrowKey ? (
              <p className="rounded-full border border-white/70 bg-white/70 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                {t(banner.eyebrowKey)}
              </p>
            ) : null}

            <h2
              id={`${banner.id}-heading`}
              className="max-w-lg font-display text-3xl font-semibold leading-tight tracking-tight text-fg-base xsmall:text-4xl"
            >
              {t(banner.titleKey)}
            </h2>

            <p className="max-w-lg text-sm leading-relaxed text-fg-subtle small:text-base">
              {t(banner.subtitleKey)}
            </p>

            <LocalizedClientLink
              href={banner.ctaHref}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0e3b3a] px-7 text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(14,59,58,0.9)] transition-colors hover:bg-[#134a48]"
            >
              {t(banner.ctaKey)}
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M4 10h11M11 5l5 5-5 5" />
              </svg>
            </LocalizedClientLink>
          </div>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/50 p-2.5 shadow-sm medium:aspect-[16/11]">
            <div className="relative h-full w-full overflow-hidden rounded-[1.15rem]">
              <Image
                src={banner.image}
                alt={t(banner.imageAltKey)}
                fill
                sizes="(min-width: 1280px) 560px, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

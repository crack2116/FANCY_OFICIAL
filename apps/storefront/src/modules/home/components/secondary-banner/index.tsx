import { t, type TranslationKey } from "@lib/i18n/translations"
import type { HomeSecondaryBanner } from "@lib/home-config"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type DepartmentRow = {
  id: string
  index: string
  href: string
  titleKey: TranslationKey
  descriptionKey: TranslationKey
}

const DEPARTMENT_ROWS: DepartmentRow[] = [
  {
    id: "hygiene",
    index: "01",
    href: "/categories/higiene",
    titleKey: "home.banner.pillar.hygiene.title",
    descriptionKey: "home.banner.pillar.hygiene.description",
  },
  {
    id: "health",
    index: "02",
    href: "/categories/salud",
    titleKey: "home.banner.pillar.health.title",
    descriptionKey: "home.banner.pillar.health.description",
  },
  {
    id: "accessories",
    index: "03",
    href: "/categories/accesorios",
    titleKey: "home.banner.pillar.accessories.title",
    descriptionKey: "home.banner.pillar.accessories.description",
  },
]

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  )
}

/**
 * Open, card-free editorial section between the product rails.
 *
 * Pairs a standalone photograph with Fraunces serif typography and a hairline-
 * divided directory of daily-care departments directly on the page canvas.
 */
export default function SecondaryBanner({
  banner,
}: {
  banner: HomeSecondaryBanner
}) {
  return (
    <section
      className="border-y border-[#EFE6D8] bg-[var(--surface,#FFFFFF)] py-14 small:py-20"
      aria-labelledby={`${banner.id}-heading`}
    >
      <div className="site-container">
        <div className="grid grid-cols-1 items-center gap-10 small:grid-cols-12 small:gap-12 medium:gap-16">
          {/* Standalone photograph on the open canvas (no card container) */}
          <div className="small:col-span-5">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-[#F4EFE7] small:aspect-[4/5]">
              <Image
                src={banner.image}
                alt={t(banner.imageAltKey)}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover object-center"
              />
            </div>
          </div>

          {/* Open typographic column + hairline-separated department list */}
          <div className="small:col-span-7">
            {banner.eyebrowKey ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C85A17]">
                {t(banner.eyebrowKey)}
              </p>
            ) : null}

            <h2
              id={`${banner.id}-heading`}
              className="mt-3 font-editorial text-[2rem] font-medium leading-[1.08] tracking-[-0.02em] text-[#0E352E] xsmall:text-[2.45rem] small:text-[2.75rem] medium:text-[3.05rem]"
            >
              Baño, cepillado y{" "}
              <span className="italic text-[#C85A17]">paseo diario</span>
            </h2>

            <p className="mt-4 max-w-[34rem] text-[15px] leading-relaxed text-[#4A5D58]">
              {t(banner.subtitleKey)}
            </p>

            <ul className="mt-8 divide-y divide-[#E6DDD0] border-y border-[#E6DDD0]">
              {DEPARTMENT_ROWS.map((item) => (
                <li key={item.id}>
                  <LocalizedClientLink
                    href={item.href}
                    className="group flex items-center justify-between gap-6 py-5 outline-none focus-visible:ring-2 focus-visible:ring-[#C85A17]"
                  >
                    <div className="flex items-baseline gap-4 small:gap-5">
                      <span
                        aria-hidden="true"
                        className="font-editorial text-sm italic text-[#B86835]"
                      >
                        {item.index}
                      </span>

                      <div>
                        <span className="block font-editorial text-xl font-medium leading-snug text-[#0E352E] transition-colors group-hover:text-[#C85A17] small:text-[1.35rem]">
                          {t(item.titleKey)}
                        </span>
                        <span className="mt-1 block max-w-[30rem] text-sm leading-relaxed text-[#526560]">
                          {t(item.descriptionKey)}
                        </span>
                      </div>
                    </div>

                    <ArrowIcon className="h-5 w-5 shrink-0 text-[#0E352E]/45 transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#C85A17]" />
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>

            <div className="mt-7">
              <LocalizedClientLink
                href={banner.ctaHref}
                className="group inline-flex items-center gap-2 border-b border-[#0E352E] pb-1 text-sm font-semibold text-[#0E352E] transition-colors hover:border-[#C85A17] hover:text-[#C85A17]"
              >
                <span>{t(banner.ctaKey)}</span>
                <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

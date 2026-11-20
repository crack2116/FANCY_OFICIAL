import { t, type TranslationKey } from "@lib/i18n/translations"
import type { HomeSecondaryBanner } from "@lib/home-config"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type RoutineLink = {
  id: string
  href: string
  titleKey: TranslationKey
  descriptionKey: TranslationKey
}

const ROUTINE_LINKS: RoutineLink[] = [
  {
    id: "hygiene",
    href: "/categories/higiene",
    titleKey: "home.banner.pillar.hygiene.title",
    descriptionKey: "home.banner.pillar.hygiene.description",
  },
  {
    id: "health",
    href: "/categories/salud",
    titleKey: "home.banner.pillar.health.title",
    descriptionKey: "home.banner.pillar.health.description",
  },
  {
    id: "accessories",
    href: "/categories/accesorios",
    titleKey: "home.banner.pillar.accessories.title",
    descriptionKey: "home.banner.pillar.accessories.description",
  },
]

/**
 * Daily-care band between the product rails.
 *
 * Deliberately plain: one flat panel, a single-colour heading, a photo and a
 * short list of real category links. No decorative glows, badges or floating
 * cards, so it reads like the rest of the storefront instead of a template.
 */
export default function SecondaryBanner({
  banner,
}: {
  banner: HomeSecondaryBanner
}) {
  return (
    <section
      className="bg-white py-10 small:py-14"
      aria-labelledby={`${banner.id}-heading`}
    >
      <div className="site-container">
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-[#0E352E] small:grid-cols-12">
          <div className="flex flex-col p-6 xsmall:p-8 small:col-span-7 medium:p-10 large:p-12">
            {banner.eyebrowKey ? (
              <p className="text-sm font-semibold text-[#F5A56D]">
                {t(banner.eyebrowKey)}
              </p>
            ) : null}

            <h2
              id={`${banner.id}-heading`}
              className="mt-2 max-w-[22ch] font-display text-[1.85rem] font-bold leading-tight text-white xsmall:text-[2.1rem] medium:text-[2.4rem]"
            >
              {t(banner.titleKey)}
            </h2>

            <p className="mt-3 max-w-[34rem] text-[15px] leading-relaxed text-[#C9DAD5]">
              {t(banner.subtitleKey)}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <LocalizedClientLink
                href={banner.ctaHref}
                className="inline-flex items-center justify-center rounded-full bg-[#F36F21] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#DF5E14]"
              >
                {t(banner.ctaKey)}
              </LocalizedClientLink>

              {banner.secondaryCtaKey && banner.secondaryCtaHref ? (
                <LocalizedClientLink
                  href={banner.secondaryCtaHref}
                  className="text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors hover:decoration-white"
                >
                  {t(banner.secondaryCtaKey)}
                </LocalizedClientLink>
              ) : null}
            </div>

            <div className="mt-auto pt-8">
              <ul className="grid grid-cols-1 border-t border-white/15 pt-2 xsmall:grid-cols-3 xsmall:gap-6 xsmall:pt-6">
                {ROUTINE_LINKS.map((item) => (
                  <li
                    key={item.id}
                    className="border-b border-white/10 last:border-b-0 xsmall:border-b-0"
                  >
                    <LocalizedClientLink
                      href={item.href}
                      className="group block py-3 xsmall:py-0"
                    >
                      <span className="block text-[15px] font-semibold text-white group-hover:underline group-hover:underline-offset-4">
                        {t(item.titleKey)}
                      </span>
                      <span className="mt-1 block text-[13px] leading-snug text-[#A9C2BC]">
                        {t(item.descriptionKey)}
                      </span>
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="relative aspect-[4/3] w-full bg-[#E8E1D4] small:col-span-5 small:aspect-auto small:min-h-[22rem]">
            <Image
              src={banner.image}
              alt={t(banner.imageAltKey)}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

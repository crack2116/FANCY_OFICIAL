import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getRegion } from "@lib/data/regions"
import { t } from "@lib/i18n/translations"
import FavoritesView from "@modules/account/components/favorites-view"

export const metadata: Metadata = {
  title: t("account.favorites"),
  description: t("account.favorites.description"),
  robots: { index: false, follow: true },
}

export default async function FavoritosPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  return (
    <div className="bg-gradient-to-b from-[#FFFDF8] to-white py-8 small:py-12">
      <div className="site-container" data-testid="public-favorites-page">
        <div className="mb-8 flex flex-col gap-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F352E]">
            {t("account.favorites")}
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            {t("account.favorites.body")}
          </p>
        </div>
        <FavoritesView countryCode={countryCode} region={region} />
      </div>
    </div>
  )
}

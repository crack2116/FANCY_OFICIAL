import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { hasSessionCookie } from "@lib/data/cookies"
import { getRegion } from "@lib/data/regions"
import { t } from "@lib/i18n/translations"
import FavoritesView from "@modules/account/components/favorites-view"

export const metadata: Metadata = {
  title: t("account.favorites"),
  description: t("account.favorites.description"),
  robots: { index: false, follow: false },
}

export default async function AccountFavoritesPage(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ reason?: string }>
}) {
  const { countryCode } = await props.params
  const { reason } = await props.searchParams

  const [customer, region, hasCookie] = await Promise.all([
    retrieveCustomer(),
    getRegion(countryCode),
    hasSessionCookie(),
  ])

  if (!customer) {
    if (hasCookie && reason !== "session-expired") {
      redirect(`/${countryCode}/account?reason=session-expired`)
    }

    return null
  }

  if (!region) {
    redirect(`/${countryCode}/store`)
  }

  return (
    <div className="w-full" data-testid="favorites-page-wrapper">
      <div className="mb-6 flex flex-col gap-y-1.5">
        <h1 className="text-2xl font-bold text-[#0F352E]">{t("account.favorites")}</h1>
        <p className="text-sm text-slate-600">{t("account.favorites.body")}</p>
      </div>
      <FavoritesView countryCode={countryCode} region={region} />
    </div>
  )
}

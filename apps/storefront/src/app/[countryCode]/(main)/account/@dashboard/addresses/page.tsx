import type { Metadata } from "next"

import { retrieveCustomer } from "@lib/data/customer"
import { hasSessionCookie } from "@lib/data/cookies"
import { getRegion } from "@lib/data/regions"
import { t } from "@lib/i18n/translations"
import { redirect } from "next/navigation"
import AddressBook from "@modules/account/components/address-book"

export const metadata: Metadata = {
  title: t("account.addresses"),
  description: t("account.addresses.description"),
  robots: { index: false, follow: false },
}

/**
 * "Direcciones".
 *
 * The region is read server-side and only to populate the country select with
 * what the shop actually sells to. `pe` is the pre-selected value because this is
 * the Peru storefront, not a hard restriction.
 *
 * Without a session this returns `null`; the `/account` layout renders the sign-in
 * slot instead. See `account/@dashboard/page.tsx` for why a redirect here would
 * loop.
 */
export default async function Addresses(props: {
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
    // Without a region there is no country list, so the form would submit a
    // country the store does not serve.
    redirect(`/${countryCode}/store`)
  }

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <div className="mb-6 flex flex-col gap-y-1.5">
        <h1 className="text-2xl font-bold text-[#0F352E]">{t("account.addresses")}</h1>
        <p className="text-sm text-slate-600">{t("account.addresses.body")}</p>
      </div>
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_8px_24px_rgba(15,53,46,0.04)]">
        <AddressBook customer={customer} region={region} />
      </div>
    </div>
  )
}
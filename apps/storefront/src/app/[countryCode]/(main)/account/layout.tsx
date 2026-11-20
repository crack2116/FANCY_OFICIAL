import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { t } from "@lib/i18n/translations"
import AccountLayout from "@modules/account/templates/account-layout"

export const metadata: Metadata = {
  title: t("account.meta.title"),
  description: t("account.meta.description"),
  robots: { index: false, follow: true },
}

export default async function AccountPageLayout({
  dashboard,
  params,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const customer = await retrieveCustomer().catch(() => null)
  const { countryCode } = await params

  // When unauthenticated, redirect to the store with ?login=true
  // so the floating login modal opens over the store rather than a standalone page.
  if (!customer) {
    redirect(`/${countryCode}?login=true`)
  }

  return (
    <AccountLayout customer={customer}>
      {dashboard}
    </AccountLayout>
  )
}

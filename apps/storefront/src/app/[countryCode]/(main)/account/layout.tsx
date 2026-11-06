import type { Metadata } from "next"

import { retrieveCustomer } from "@lib/data/customer"
// TODO: Re-add Toaster component when needed
import { t } from "@lib/i18n/translations"
import AccountLayout from "@modules/account/templates/account-layout"

/**
 * Account area metadata and slot selection.
 *
 * `@dashboard` holds the signed-in pages and `@login` the sign-in/register form.
 * Which one is visible is decided HERE, from the single source of truth: the
 * customer record itself. A child page never decides whether the shopper is
 * signed in, so the two slots can never disagree.
 *
 * A child page returns `null` when there is no session rather than redirecting,
 * because this layout already shows the sign-in form in that case; redirecting
 * from the slot would send the shopper back to this same URL forever. The
 * expired-session message reaches the form through the fixed `reason` value those
 * pages set once — see `account/@dashboard/page.tsx`.
 *
 * The account components live in `src/modules/account` and the copy in
 * `src/lib/i18n/translations.ts`; both are Spanish (es-PE), so this layout only
 * had to supply the document title and description.
 */
export const metadata: Metadata = {
  title: t("account.meta.title"),
  description: t("account.meta.description"),
  robots: { index: false, follow: true },
}

export default async function AccountPageLayout({
  dashboard,
  login,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
}) {
  const customer = await retrieveCustomer().catch(() => null)

  return (
    <AccountLayout customer={customer}>
      {customer ? dashboard : login}
      {/* TODO: Re-add Toaster component when needed */}
    </AccountLayout>
  )
}
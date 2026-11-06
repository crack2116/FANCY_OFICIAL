import type { Metadata } from "next"

import { retrieveCustomer } from "@lib/data/customer"
import { hasSessionCookie } from "@lib/data/cookies"
import { t } from "@lib/i18n/translations"
import { redirect } from "next/navigation"
import ProfileDetails from "@modules/account/components/profile-details"
import ProfileEmail from "@modules/account/components/profile-email"

export const metadata: Metadata = {
  title: t("account.profile"),
  description: t("account.profile.description"),
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ reason?: string }>
}

/**
 * "Mis datos".
 *
 * A server component: the page only reads the customer and renders two blocks,
 * one of which is a form. The form itself is the client island.
 *
 * The saved-address form that used to live here is gone. Addresses have their own
 * page (`/account/addresses`) and their own set of default flags; having a second
 * address form here meant one thing could be edited in two places with two
 * different behaviours.
 *
 * WITHOUT A SESSION this returns `null`, because the `/account` layout renders the
 * sign-in slot instead of this one. See `account/@dashboard/page.tsx` for why a
 * redirect here would loop.
 */
export default async function Profile(props: Props) {
  const { countryCode } = await props.params
  const { reason } = await props.searchParams

  const [customer, hasCookie] = await Promise.all([
    retrieveCustomer(),
    hasSessionCookie(),
  ])

  if (!customer) {
    if (hasCookie && reason !== "session-expired") {
      redirect(`/${countryCode}/account?reason=session-expired`)
    }

    return null
  }

  return (
    <div className="w-full" data-testid="profile-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl font-semibold text-fg-base">{t("account.profile")}</h1>
        <p className="text-base-regular text-fg-base">{t("account.profile.body")}</p>
      </div>
      <div className="flex w-full flex-col gap-y-8">
        <ProfileDetails customer={customer} />
        <div className="h-px w-full bg-[var(--border-subtle)]" />
        <ProfileEmail customer={customer} />
      </div>
    </div>
  )
}
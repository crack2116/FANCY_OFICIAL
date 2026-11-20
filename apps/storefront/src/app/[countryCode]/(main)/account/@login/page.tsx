import type { Metadata } from "next"

import { t } from "@lib/i18n/translations"
import LoginTemplate from "@modules/account/templates/login-template"

export const metadata: Metadata = {
  title: t("account.login.title"),
  description: t("account.login.body"),
  robots: { index: false, follow: false },
}

/**
 * The `@login` slot: rendered only when the layout finds no usable session.
 *
 * `reason=session-expired` is a FIXED value this app produces, not a redirect
 * target. The check is an exact string comparison, so nothing a visitor can put
 * in the query string reaches the UI except that one message, and there is no
 * `returnTo`-style parameter to abuse.
 *
 * There is deliberately no `returnTo`: the only place a shopper can be sent back
 * to is `/<countryCode>/account`, which the server action derives from the route
 * itself. Accepting one from the query string would be an open-redirect waiting to
 * happen.
 */
export default async function Login(props: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await props.searchParams

  return <LoginTemplate sessionExpired={reason === "session-expired"} />
}
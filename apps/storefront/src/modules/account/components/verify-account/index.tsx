"use client"

/**
 * Email-verification result screen.
 *
 * Email verification IS NOT ENABLED in this build: no email provider is
 * configured, so the backend never answers `verification_required` and no
 * confirmation mail can ever be sent. The screen exists only because a link from
 * an older session could still land here, and it says plainly what is true
 * instead of pretending a mail was sent.
 */

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@modules/common/components/ui"
import { t } from "@lib/i18n/translations"
import { confirmEmailVerification } from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type VerificationState = "verifying" | "success" | "error"

const VerifyAccount = () => {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [state, setState] = useState<VerificationState>("verifying")
  // Guard against the effect running twice in React Strict Mode, which would
  // consume the single-use token before the customer sees the result.
  const confirmed = useRef(false)

  useEffect(() => {
    if (confirmed.current) {
      return
    }
    confirmed.current = true

    if (!token) {
      setState("error")
      return
    }

    confirmEmailVerification(token).then(({ success }) =>
      setState(success ? "success" : "error")
    )
  }, [token])

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center text-center gap-y-4"
      data-testid="verify-account-page"
    >
      <h1 className="text-large-semi">{t("account.verify.title")}</h1>
      <p className="text-base-regular text-ui-fg-base">{t("account.verify.body")}</p>

      {state === "verifying" ? (
        <p className="text-base-regular text-ui-fg-base" role="status">
          {t("account.verify.inProgress")}
        </p>
      ) : null}

      {state === "success" ? (
        <>
          <p className="text-base-regular text-ui-fg-base" role="status">
            {t("account.verify.success")}
          </p>
          <LocalizedClientLink href="/account">
            <Button>{t("account.verify.backToAccount")}</Button>
          </LocalizedClientLink>
        </>
      ) : null}

      {state === "error" ? (
        <>
          <p className="text-base-regular text-ui-fg-base" role="alert">
            {t("account.verify.error")}
          </p>
          <LocalizedClientLink href="/account">
            <Button variant="secondary">{t("account.verify.backToAccount")}</Button>
          </LocalizedClientLink>
        </>
      ) : null}
    </div>
  )
}

export default VerifyAccount
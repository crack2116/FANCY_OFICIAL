"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { login } from "@lib/data/customer"
import { t } from "@lib/i18n/translations"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import GoogleSignInButton from "../google-button"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
  /** True when the shopper arrived here because their session expired. */
  sessionExpired?: boolean
  /** Optional callback fired when login completes successfully (e.g. to close a modal). */
  onSuccess?: () => void
  /** If false, suppresses the internal h1/p header (useful when a parent card or modal already has one). */
  showHeading?: boolean
}

/**
 * Sign-in form.
 *
 * NO "FORGOT YOUR PASSWORD" LINK
 * This build has no email provider, so a reset mail cannot be sent. A link that
 * pretends otherwise would either fail silently or send the shopper to a page
 * that cannot work, so the option is simply absent rather than faked. The
 * decision is documented in the phase report.
 *
 * The error text comes from the shared public-error layer via `login`, so a
 * Medusa payload, an auth-provider string or a stack can never reach this form.
 */
const Login = ({
  setCurrentView,
  sessionExpired = false,
  onSuccess,
  showHeading = true,
}: Props) => {
  const [message, formAction] = useActionState(login, null)
  const router = useRouter()

  useEffect(() => {
    if (message?.state === "success") {
      if (onSuccess) {
        onSuccess()
      }
      router.refresh()
    }
  }, [message, router, onSuccess])

  return (
    <div
      className="w-full max-w-sm flex flex-col items-center"
      data-testid="login-page"
    >
      {showHeading ? (
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mb-1.5 tracking-tight">
            {t("account.login.title")}
          </h1>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            {t("account.login.body")}
          </p>
        </div>
      ) : null}

      {sessionExpired ? (
        <div
          className="w-full mb-5 text-sm text-amber-900 bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 flex items-center gap-2.5 shadow-xs"
          role="status"
          data-testid="session-expired-message"
        >
          <span className="text-amber-600 font-bold">ℹ</span>
          <span>{t("error.auth.sessionExpired")}</span>
        </div>
      ) : null}

      <GoogleSignInButton />

      <form className="w-full" action={formAction} noValidate>
        <div className="flex flex-col w-full gap-y-3">
          <Input
            label={t("account.login.field.email")}
            name="email"
            type="email"
            title={t("account.profile.error.email")}
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label={t("account.login.field.password")}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>

        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="login-error-message"
        />

        <SubmitButton
          variant="brand"
          data-testid="sign-in-button"
          className="w-full mt-6 h-12 rounded-2xl font-bold text-[15px] shadow-[0_4px_16px_rgba(243,111,33,0.3)] hover:shadow-[0_6px_20px_rgba(243,111,33,0.4)]"
        >
          {t("account.login.submit")}
        </SubmitButton>
      </form>

      <div className="text-center text-slate-600 text-xs sm:text-sm mt-6">
        <span>{t("account.login.notMember")} </span>
        <button
          type="button"
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="font-bold text-[#F36F21] hover:text-[#D95300] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F36F21] rounded-sm transition-colors"
          data-testid="register-button"
        >
          {t("account.login.join")}
        </button>
      </div>
    </div>
  )
}

export default Login

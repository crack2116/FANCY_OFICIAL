"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signup } from "@lib/data/customer"
import { t } from "@lib/i18n/translations"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import GoogleSignInButton from "../google-button"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
  /** Optional callback fired when registration completes successfully. */
  onSuccess?: () => void
  /** If false, suppresses the internal header. */
  showHeading?: boolean
}

/**
 * Registration form.
 *
 * NO EMAIL VERIFICATION
 * The backend would only answer `verification_required` if an email provider is
 * configured, and none is. The UI therefore does not mention verification at
 * all: the flow registers, signs in and lands on the dashboard. A
 * "check your inbox" message would be a promise the server cannot keep.
 *
 * The legal sentence names no link, because this build has no privacy policy or
 * terms page — a link to a 404 reads as a broken store.
 */
const Register = ({
  setCurrentView,
  onSuccess,
  showHeading = true,
}: Props) => {
  const [message, formAction] = useActionState(signup, null)
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
      data-testid="register-page"
    >
      {showHeading ? (
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mb-1.5 tracking-tight">
            {t("account.register.title")}
          </h1>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            {t("account.register.body")}
          </p>
        </div>
      ) : null}

      <GoogleSignInButton />

      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label={t("account.register.field.firstName")}
              name="first_name"
              required
              autoComplete="given-name"
              data-testid="first-name-input"
            />
            <Input
              label={t("account.register.field.lastName")}
              name="last_name"
              required
              autoComplete="family-name"
              data-testid="last-name-input"
            />
          </div>
          <Input
            label={t("account.register.field.email")}
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label={t("account.register.field.phone")}
            name="phone"
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label={t("account.register.field.password")}
            name="password"
            required
            type="password"
            autoComplete="new-password"
            data-testid="password-input"
          />
        </div>

        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="register-error"
        />

        <p className="text-center text-slate-500 text-xs mt-4 leading-relaxed">
          {t("account.register.termsPrefix")}
        </p>

        <SubmitButton
          variant="brand"
          className="w-full mt-5 h-12 rounded-2xl font-bold text-[15px] shadow-[0_4px_16px_rgba(243,111,33,0.3)] hover:shadow-[0_6px_20px_rgba(243,111,33,0.4)]"
          data-testid="register-button"
        >
          {t("account.register.submit")}
        </SubmitButton>
      </form>

      <div className="text-center text-slate-600 text-xs sm:text-sm mt-6">
        <span>{t("account.register.hasAccount")} </span>
        <button
          type="button"
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="font-bold text-[#F36F21] hover:text-[#D95300] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F36F21] rounded-sm transition-colors"
          data-testid="sign-in-button"
        >
          {t("account.register.signIn")}
        </button>
      </div>
    </div>
  )
}

export default Register

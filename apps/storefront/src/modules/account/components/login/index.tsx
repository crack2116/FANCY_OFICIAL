import { useActionState } from "react"
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
  sessionExpired: boolean
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
const Login = ({ setCurrentView, sessionExpired }: Props) => {
  const [message, formAction] = useActionState(login, null)

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center"
      data-testid="login-page"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
        {t("account.login.eyebrow")}
      </p>
      <h1 className="mb-3 text-center font-display text-3xl font-semibold tracking-tight text-fg-base">
        {t("account.login.title")}
      </h1>
      <p className="mb-8 text-center text-sm leading-relaxed text-fg-subtle">
        {t("account.login.body")}
      </p>

      {sessionExpired ? (
        <div
          className="w-full mb-6 text-base-regular text-ui-fg-base bg-ui-bg-subtle border border-ui-border-base rounded-rounded p-4"
          role="status"
          data-testid="session-expired-message"
        >
          {t("error.auth.sessionExpired")}
        </div>
      ) : null}

      <GoogleSignInButton />

      <form className="w-full" action={formAction} noValidate>
        <div className="flex flex-col w-full gap-y-2">
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
          data-testid="sign-in-button"
          className="mt-6 w-full !bg-brand-700 text-white shadow-[0_12px_24px_-16px_rgba(163,81,15,0.9)] hover:!bg-brand-800 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          {t("account.login.submit")}
        </SubmitButton>
      </form>

      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        {t("account.login.notMember")}{" "}
        <button
          type="button"
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="rounded-sm font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          data-testid="register-button"
        >
          {t("account.login.join")}
        </button>
        .
      </span>
    </div>
  )
}

export default Login
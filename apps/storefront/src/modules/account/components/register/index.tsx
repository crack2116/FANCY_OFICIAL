import { useActionState } from "react"
import { signup } from "@lib/data/customer"
import { t } from "@lib/i18n/translations"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import GoogleSignInButton from "../google-button"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
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
const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup, null)

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center"
      data-testid="register-page"
    >
      <h1 className="text-2xl-semi mb-3 text-center">
        {t("account.register.title")}
      </h1>
      <p className="text-center text-base-regular text-ui-fg-subtle mb-4">
        {t("account.register.body")}
      </p>

      <GoogleSignInButton />

      <form className="w-full flex flex-col" action={formAction} noValidate>
        <div className="flex flex-col w-full gap-y-2">
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
        <span className="text-center text-ui-fg-base text-small-regular mt-6">
          {t("account.register.termsPrefix")}
        </span>
        <SubmitButton
          className="w-full mt-6 !bg-brand-800 text-white hover:!bg-brand-900 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          data-testid="register-button"
        >
          {t("account.register.submit")}
        </SubmitButton>
      </form>

      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        {t("account.register.hasAccount")}{" "}
        <button
          type="button"
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
          data-testid="sign-in-button"
        >
          {t("account.register.signIn")}
        </button>
        .
      </span>
    </div>
  )
}

export default Register
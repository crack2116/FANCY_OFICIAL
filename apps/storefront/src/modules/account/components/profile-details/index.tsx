"use client"

/**
 * The editable half of the profile: first name, last name and phone, saved as
 * ONE update.
 *
 * Why one form and not three: they are three columns of the same customer row,
 * and the backend updates them in a single `POST /store/customers/me`. Three
 * forms would mean three round trips, three separate success banners, and a
 * half-saved state if the second failed.
 *
 * EMAIL IS NOT HERE ON PURPOSE
 * Medusa 2.21.2's `StoreUpdateCustomer` zod schema has no `email` key and is
 * neither `.strict()` nor `.passthrough()`, so zod strips it silently — the
 * call would report success and nothing would change. The email is rendered
 * read-only by `ProfileEmail` instead.
 *
 * VALIDATION RUNS TWICE, ON THE SAME CODE
 * `validateProfile` runs here for instant feedback and again inside the server
 * action, so a direct POST or a stale bundle cannot skip the rules. The message
 * a shopper sees is therefore identical either way.
 */

import { useActionState, useEffect, useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import { updateCustomer, type ProfileActionState } from "@lib/data/customer"
import {
  hasErrors,
  validateProfile,
  type ProfileField,
  type ValidationErrors,
} from "@lib/validation/account"
import AccountInfo from "../account-info"
import Input from "@modules/common/components/input"

const INITIAL_STATE: ProfileActionState = {
  success: false,
  error: null,
  fieldErrors: {},
}

const ProfileDetails = ({ customer }: { customer: HttpTypes.StoreCustomer }) => {
  const [clearToken, setClearToken] = useState(0)
  // Errors produced by the last client-side check, shown without a round trip.
  const [clientErrors, setClientErrors] = useState<ValidationErrors<ProfileField>>({})
  const email = customer.email ?? ""

  const saveProfile = async (
    _previous: ProfileActionState,
    formData: FormData
  ): Promise<ProfileActionState> => {
    const input = {
      firstName: (formData.get("first_name") as string | null) ?? "",
      lastName: (formData.get("last_name") as string | null) ?? "",
      phone: (formData.get("phone") as string | null) ?? "",
      email,
    }

    const errors = validateProfile(input)
    setClientErrors(errors)

    if (hasErrors(errors)) {
      return { success: false, error: null, fieldErrors: errors }
    }

    return updateCustomer(
      {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        phone: input.phone.trim(),
      },
      email
    )
  }

  const [state, formAction] = useActionState(saveProfile, INITIAL_STATE)

  // Opening the editor clears whatever the previous attempt said. `clearToken`
  // changes on every toggle, which is what re-runs this effect.
  useEffect(() => {
    setClientErrors({})
    setClearToken(0)
  }, [clearToken])

  const fieldError = (field: ProfileField) =>
    state.fieldErrors[field] ?? clientErrors[field]

  const currentValue = [customer.first_name, customer.last_name].filter(Boolean).join(" ")

  return (
    <form action={formAction} className="w-full" noValidate data-testid="profile-details-form">
      <AccountInfo
        label={t("account.profile.section.name")}
        currentInfo={currentValue || t("account.dashboard.greeting.anonymous")}
        isSuccess={state.success}
        isError={!!state.error}
        errorMessage={state.error}
        clearState={() => setClearToken((token) => token + 1)}
        panelId="profile-details-panel"
        data-testid="account-details-editor"
      >
        <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-x-4 gap-y-2">
          <ValidatedInput
            name="first_name"
            label={t("account.profile.field.firstName")}
            defaultValue={customer.first_name ?? ""}
            autoComplete="given-name"
            error={fieldError("firstName")}
            testId="first-name-input"
          />
          <ValidatedInput
            name="last_name"
            label={t("account.profile.field.lastName")}
            defaultValue={customer.last_name ?? ""}
            autoComplete="family-name"
            error={fieldError("lastName")}
            testId="last-name-input"
          />
        </div>
      </AccountInfo>

      <div className="my-6 h-px w-full bg-[var(--border-subtle)]" />

      <AccountInfo
        label={t("account.profile.section.phone")}
        currentInfo={customer.phone ?? t("account.profile.phone.empty")}
        isSuccess={state.success}
        isError={!!state.error}
        errorMessage={state.error}
        clearState={() => setClearToken((token) => token + 1)}
        panelId="profile-phone-panel"
        data-testid="account-phone-editor"
      >
        <ValidatedInput
          name="phone"
          type="tel"
          label={t("account.profile.field.phone")}
          defaultValue={customer.phone ?? ""}
          autoComplete="tel"
          hint={t("account.profile.field.phoneHint")}
          error={fieldError("phone")}
          testId="phone-input"
        />
      </AccountInfo>
    </form>
  )
}

type ValidatedInputProps = {
  name: string
  label: string
  error?: string
  type?: string
  autoComplete?: string
  defaultValue?: string
  hint?: string
  testId?: string
}

/**
 * A labelled input wired for validation.
 *
 * The three attributes are what make the error reachable non-visually:
 * `aria-invalid` marks the field as wrong, `aria-describedby` points at the
 * error text, and the message is rendered in the same place every time so the
 * id is never dangling.
 */
const ValidatedInput = ({
  name,
  label,
  error,
  type = "text",
  autoComplete,
  defaultValue,
  hint,
  testId,
}: ValidatedInputProps) => {
  const errorId = `${name}-error`
  const hintId = `${name}-hint`

  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="flex flex-col gap-1">
      <Input
        name={name}
        type={type}
        label={label}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        data-testid={testId}
      />
      {hint ? (
        <span id={hintId} className="txt-compact-small text-ui-fg-muted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span
          id={errorId}
          role="alert"
          className="text-rose-500 txt-compact-small"
          data-testid={`${name}-error`}
        >
          {error}
        </span>
      ) : null}
    </div>
  )
}

export default ProfileDetails
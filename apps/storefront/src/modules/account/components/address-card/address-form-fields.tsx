"use client"

/**
 * The shared address form, used by both "new address" and "edit address".
 *
 * One implementation means the two dialogs cannot drift: same fields, same
 * labels, same validation, same error ids.
 *
 * FIELDS ARE THE REAL ONES
 * A Medusa customer address has `address_name`, `first_name`, `last_name`,
 * `company`, `address_1`, `address_2`, `city`, `postal_code`, `province`,
 * `country_code` and `phone`. There is no `district` and no `region` column, so
 * the Peruvian concepts are mapped honestly: `city` is labelled "Distrito o
 * ciudad" and `province` is "Departamento o región". Nothing is invented and
 * nothing is silently dropped.
 *
 * DEFAULTS
 * `country_code` defaults to `pe` — this is the Peru storefront — but the
 * select still lists whatever the region offers, so a second region is a data
 * change rather than a code change.
 *
 * A11y
 * Every control has a real `<label>` bound by `htmlFor`, invalid fields carry
 * `aria-invalid`, and `aria-describedby` points at the message actually
 * rendered below that field. The whole form reports its failure with
 * `role="alert"`.
 */

import { useMemo } from "react"
import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import { siteConfig } from "@lib/site-config"
import type { AddressField, ValidationErrors } from "@lib/validation/account"
import Input from "@modules/common/components/input"
import CountrySelect from "@modules/checkout/components/country-select"

/** Peru is the storefront's region, so it is the pre-selected country. */
const DEFAULT_COUNTRY_CODE = siteConfig.defaultCountryCode.toLowerCase()

type AddressFormFieldsProps = {
  region: HttpTypes.StoreRegion
  address?: HttpTypes.StoreCustomerAddress | null
  fieldErrors: ValidationErrors<AddressField>
  countryError?: string
}

export const AddressFormFields = ({
  region,
  address,
  fieldErrors,
  countryError,
}: AddressFormFieldsProps) => {
  // NativeSelect has no visible label of its own, so the label is rendered here
  // and bound to the control by id.
  const countryId = useMemo(() => "address-country_code", [])

  return (
    <div className="flex flex-col gap-y-3">
      <TextField
        name="address_name"
        label={t("address.field.label")}
        defaultValue={address?.address_name ?? ""}
        error={fieldErrors.addressName}
        autoComplete="off"
        hint={t("address.field.labelHint")}
        testId="address-name-input"
      />
      <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-x-3">
        <TextField
          name="first_name"
          label={t("address.field.firstName")}
          defaultValue={address?.first_name ?? ""}
          error={fieldErrors.firstName}
          autoComplete="given-name"
          testId="first-name-input"
        />
        <TextField
          name="last_name"
          label={t("address.field.lastName")}
          defaultValue={address?.last_name ?? ""}
          error={fieldErrors.lastName}
          autoComplete="family-name"
          testId="last-name-input"
        />
      </div>
      <TextField
        name="company"
        label={t("address.field.company")}
        defaultValue={address?.company ?? ""}
        error={fieldErrors.company}
        autoComplete="organization"
        testId="company-input"
      />
      <TextField
        name="address_1"
        label={t("address.field.address1")}
        defaultValue={address?.address_1 ?? ""}
        error={fieldErrors.address1}
        autoComplete="address-line1"
        testId="address-1-input"
      />
      <TextField
        name="address_2"
        label={t("address.field.address2")}
        defaultValue={address?.address_2 ?? ""}
        error={fieldErrors.address2}
        autoComplete="address-line2"
        testId="address-2-input"
      />
      <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-x-3">
        <TextField
          name="postal_code"
          label={t("address.field.postalCode")}
          defaultValue={address?.postal_code ?? ""}
          error={fieldErrors.postalCode}
          autoComplete="postal-code"
          testId="postal-code-input"
        />
        <TextField
          name="city"
          label={t("address.field.city")}
          defaultValue={address?.city ?? ""}
          error={fieldErrors.city}
          autoComplete="address-level2"
          testId="city-input"
        />
      </div>
      <TextField
        name="province"
        label={t("address.field.province")}
        defaultValue={address?.province ?? ""}
        error={fieldErrors.province}
        autoComplete="address-level1"
        testId="province-input"
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={countryId} className="text-sm font-medium">
          {t("address.field.country")}
        </label>
        <CountrySelect
          id={countryId}
          region={region}
          name="country_code"
          placeholder={t("address.field.country")}
          defaultValue={address?.country_code ?? DEFAULT_COUNTRY_CODE}
          aria-invalid={countryError ? true : undefined}
          aria-describedby={countryError ? `${countryId}-error` : undefined}
          data-testid="country-select"
        />
        {countryError ? (
          <span
            id={`${countryId}-error`}
            role="alert"
            className="text-rose-500 text-small-regular"
            data-testid="country-code-error"
          >
            {countryError}
          </span>
        ) : null}
      </div>
      <TextField
        name="phone"
        type="tel"
        label={t("address.field.phone")}
        defaultValue={address?.phone ?? ""}
        error={fieldErrors.phone}
        autoComplete="tel"
        testId="phone-input"
      />
    </div>
  )
}

type TextFieldProps = {
  name: string
  label: string
  defaultValue?: string
  error?: string
  type?: string
  autoComplete?: string
  hint?: string
  testId?: string
}

const TextField = ({
  name,
  label,
  defaultValue,
  error,
  type = "text",
  autoComplete,
  hint,
  testId,
}: TextFieldProps) => {
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

export default AddressFormFields
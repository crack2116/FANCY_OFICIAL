/**
 * Account form validation.
 *
 * ONE implementation, used by the client form and by the server action. A
 * shopper therefore gets the same Spanish message before and after a round
 * trip, and a rule can never be "enforced in the browser but missing on the
 * server".
 *
 * This module is imported from both sides, so it must stay free of server-only
 * imports: no `server-only`, no `next/headers`, no database access.
 *
 * Messages are looked up in the translation dictionary rather than written
 * here, so all visible copy stays in `src/lib/i18n/translations.ts`.
 */

import { t, type TranslationKey } from "@lib/i18n/translations"

/** Field-keyed validation errors. `undefined` means "no error". */
export type ValidationErrors<Field extends string> = Partial<Record<Field, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

/**
 * Deliberately permissive on the local part and strict on the shape: one `@`,
 * no whitespace, and a dotted domain. Anything stricter starts rejecting
 * addresses that really exist, and the backend's own check is the final
 * authority anyway — this exists to give a shopper an answer before the
 * round trip.
 */
export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= 254 && EMAIL_PATTERN.test(trimmed)
}

/**
 * 7 to 15 digits, optionally prefixed with `+`, with spaces, dots, dashes or
 * parentheses as separators.
 *
 * There is deliberately NO Peruvian leading-digit rule. Peru's mobile numbers
 * are 9 digits starting with `9` but its Lima landlines are 9 digits starting
 * with `0`, so any single-digit rule would reject a number this shop has
 * already sold to.
 */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim()

  if (!/^\+?[0-9][0-9\s().-]*$/.test(trimmed)) {
    return false
  }

  const digits = trimmed.replace(/\D/g, "")
  return digits.length >= 7 && digits.length <= 15
}

export type ProfileInput = {
  firstName: string
  lastName: string
  phone: string
  email: string
}

export type ProfileField = keyof ProfileInput

/**
 * Validate the profile form.
 *
 * `firstName` and `lastName` are required because an order confirmation is
 * addressed to them. `phone` is optional — Medusa's `StoreUpdateCustomer`
 * accepts a nullish phone — but a phone that IS entered must be a real number,
 * otherwise the delivery flow breaks later. `email` is read-only in the UI and
 * is validated anyway so the same rules apply wherever the value is checked.
 */
export function validateProfile(input: ProfileInput): ValidationErrors<ProfileField> {
  const errors: ValidationErrors<ProfileField> = {}

  if (!input.firstName.trim()) {
    errors.firstName = t("account.profile.error.firstName")
  }

  if (!input.lastName.trim()) {
    errors.lastName = t("account.profile.error.lastName")
  }

  if (input.phone.trim() && !isValidPhone(input.phone)) {
    errors.phone = t("account.profile.error.phone")
  }

  if (!isValidEmail(input.email)) {
    errors.email = t("account.profile.error.email")
  }

  return errors
}

export type AddressInput = {
  addressName: string
  firstName: string
  lastName: string
  company: string
  address1: string
  address2: string
  postalCode: string
  city: string
  province: string
  countryCode: string
  phone: string
}

export type AddressField = keyof AddressInput

const ADDRESS_REQUIRED: ReadonlyArray<readonly [AddressField, TranslationKey]> = [
  ["firstName", "address.error.firstName"],
  ["lastName", "address.error.lastName"],
  ["address1", "address.error.address1"],
  ["postalCode", "address.error.postalCode"],
  ["city", "address.error.city"],
  ["countryCode", "address.error.country"],
]

/**
 * Validate an address against the columns a Medusa customer address really
 * has. `company`, `address2`, `province`, `addressName` and `phone` are all
 * nullable in the schema and are therefore optional here; a phone that is
 * filled in still has to be a real number.
 */
export function validateAddress(input: AddressInput): ValidationErrors<AddressField> {
  const errors: ValidationErrors<AddressField> = {}

  for (const [field, messageKey] of ADDRESS_REQUIRED) {
    if (!input[field].trim()) {
      errors[field] = t(messageKey)
    }
  }

  if (input.phone.trim() && !isValidPhone(input.phone)) {
    errors.phone = t("address.error.phone")
  }

  return errors
}

export function hasErrors<Field extends string>(errors: ValidationErrors<Field>): boolean {
  return Object.keys(errors).length > 0
}

/** Read a `FormData` entry as a trimmed string, never `null`. */
export function readField(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}
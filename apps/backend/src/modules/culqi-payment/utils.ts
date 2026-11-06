import { MedusaError } from "@medusajs/framework/utils"
import type { BigNumberInput } from "@medusajs/framework/types"

/**
 * Validates and normalizes currency for Culqi.
 * Culqi strictly requires PEN for Peruvian domestic commerce.
 */
export function validateCurrency(currencyCode: string): string {
  if (!currencyCode) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Currency code is required for Culqi payments."
    )
  }

  const normalized = currencyCode.trim().toUpperCase()
  if (normalized !== "PEN") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Culqi provider in FancyPeru strictly supports 'PEN' (Peruvian Soles). Received: '${currencyCode}'.`
    )
  }

  return normalized
}

/**
 * Converts a Medusa amount to integer céntimos for Culqi.
 *
 * Medusa 2 delivers amounts to payment providers in MAJOR currency units
 * (S/ 79.90 arrives as the number 79.9, sometimes as the BigNumberRawValue
 * object `{ value: "79.9" }` used by JSONB big-number columns). The provider
 * is the boundary that scales to the smallest currency unit, exactly like the
 * official Stripe provider (x10^decimals, decimals = 2 for PEN).
 *
 * - Float artifacts (e.g. 79.9 * 100 => 7989.999999999999) are fixed with
 *   Math.round, which snaps to the nearest integer céntimo.
 * - Currency defaults to PEN (2 decimal places); any other code is rejected
 *   by validateCurrency and the error propagates to the caller.
 *
 * Throws INVALID_DATA for undefined/null/NaN/non-finite/<= 0 inputs, empty or
 * comma-decimal strings, and boolean-shaped garbage. Comma decimals fail on
 * purpose: Medusa serializes amounts as dot-decimal, so a comma means data
 * corruption that must never be silently re-scaled.
 */
export function toCulqiCentimos(
  amount: BigNumberInput | number | string,
  currencyCode: string = "PEN"
): number {
  validateCurrency(currencyCode)

  const major = toMajorNumber(amount)

  const centimos = Math.round(major * 100)

  if (!Number.isSafeInteger(centimos) || centimos <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Calculated céntimos amount must be a positive safe integer. Received: ${centimos}.`
    )
  }

  return centimos
}

/**
 * Normalizes any BigNumberInput-like amount to its numeric value in MAJOR units.
 * Handles plain numbers, dot-decimal strings, BigNumberRawValue objects
 * (`{ value }`), Medusa BigNumber instances (`raw.value`) and bignumber.js
 * instances (`toNumber()`). The `precision` field of a raw value is NOT used to
 * rescale: it is the storage/serialization precision, not a unit exponent.
 */
function toMajorNumber(amount: BigNumberInput | number | string): number {
  if (amount === undefined || amount === null) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Amount is required for Culqi payment operations."
    )
  }

  let major: number

  if (typeof amount === "number") {
    major = amount
  } else if (typeof amount === "string") {
    const trimmed = amount.trim()
    if (trimmed === "") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Amount is required for Culqi payment operations."
      )
    }
    major = Number(trimmed)
  } else if (typeof amount === "object") {
    const anyAmount = amount as Record<string, any>
    const rawValue = anyAmount?.raw?.value ?? anyAmount?.value
    if (typeof rawValue === "number" || typeof rawValue === "string") {
      major = Number(rawValue)
    } else if (typeof anyAmount?.numeric === "number") {
      major = anyAmount.numeric
    } else if (typeof anyAmount?.toNumber === "function") {
      major = anyAmount.toNumber()
    } else {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid amount object provided to Culqi: expected a value, raw.value or numeric number."
      )
    }
  } else {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid amount provided to Culqi: '${String(amount)}'. Must be a valid finite number.`
    )
  }

  if (!Number.isFinite(major) || Number.isNaN(major)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid amount provided to Culqi: '${String(amount)}'. Must be a valid finite number.`
    )
  }

  if (major <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Payment amount must be greater than zero. Received: ${major}.`
    )
  }

  return major
}

/**
 * Converts an integer céntimos amount coming back FROM Culqi into the Medusa
 * major-unit number (e.g. 16996 céntimos => 169.96 S/). The resulting double
 * matches the decimal literal Medusa serialized, so core MathBN comparisons
 * (capture/refund guards) operate on the exact same value.
 *
 * Throws INVALID_DATA when the input is not a positive safe integer.
 */
export function fromCulqiCentimos(centimos: number): number {
  if (
    centimos === undefined ||
    centimos === null ||
    typeof centimos !== "number" ||
    !Number.isSafeInteger(centimos) ||
    centimos <= 0
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Culqi amount must be a positive safe integer in céntimos. Received: ${centimos}.`
    )
  }

  return centimos / 100
}

/**
 * True when the event amount and the server-to-server amount refer to the same
 * money (both positive safe integers and strictly equal). Non-throwing by
 * design so webhook callers can treat false as NOT_SUPPORTED instead of an API
 * error. If either number is missing or malformed the check fails closed.
 */
export function assertAmountMatchCents(
  storedCents: unknown,
  eventCents: unknown
): boolean {
  if (typeof storedCents !== "number" || typeof eventCents !== "number") {
    return false
  }
  return (
    Number.isSafeInteger(storedCents) &&
    storedCents > 0 &&
    Number.isSafeInteger(eventCents) &&
    eventCents > 0 &&
    storedCents === eventCents
  )
}

/**
 * Validates currency and an amount that is ALREADY stored in céntimos
 * (provider-owned session data, e.g. `session.data.amount` written by
 * initiatePayment). Contract violation (missing, float, string digits, negative
 * or zero) throws INVALID_DATA: re-initialize the payment session in that case,
 * never guess the amount.
 */
export function requireStoredCentimos(
  storedAmount: unknown,
  currencyCode: string = "PEN"
): number {
  validateCurrency(currencyCode)

  let value: number
  if (storedAmount !== null && typeof storedAmount === "object") {
    value = Number((storedAmount as Record<string, unknown>).value)
  } else if (typeof storedAmount === "number") {
    value = storedAmount
  } else {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Session data.amount must be a positive safe integer céntimos value. Received: ${String(
        storedAmount
      )}. Re-initiate the payment session.`
    )
  }

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Session data.amount must be a positive safe integer céntimos value. Received: ${String(
        storedAmount
      )}. Re-initiate the payment session.`
    )
  }

  return value
}

/**
 * Safely sanitizes phone number for Culqi antifraud payload (digits only, max 15 chars).
 */
export function sanitizePhone(phone?: string | null): string | undefined {
  if (!phone) return undefined
  const cleaned = phone.replace(/[^\d+]/g, "").trim()
  return cleaned.length > 0 ? cleaned.slice(0, 15) : undefined
}

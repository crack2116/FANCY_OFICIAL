"use client"

import { Minus, Plus } from "@medusajs/icons"
import { useId } from "react"

import { t } from "@lib/i18n/translations"

/**
 * `[-] n [+]`, bounded by the stock the API actually reports.
 *
 * Minimum 1: a cart line of zero units is not a thing, and letting the control
 * reach 0 and then -1 is how a shopper ends up submitting a negative quantity
 * the backend has to reject.
 *
 * The maximum is `max`, the real purchasable quantity of the SELECTED variant,
 * computed by `getVariantStockCap`. It is `null` when the variant does not track
 * inventory or allows backorders, and `null` means "no stated limit" rather than
 * "zero" — the control then grows without a ceiling instead of refusing to
 * increase.
 *
 * The buttons are real `<button type="button">` elements inside a real
 * `<fieldset>` with a real `<legend>`, and the value is exposed through
 * `aria-live` so a screen-reader user hears the new quantity.
 */
export default function QuantityInput({
  quantity,
  onChange,
  max,
  disabled = false,
  className,
}: {
  quantity: number
  onChange: (quantity: number) => void
  /** Real stock ceiling, or `null` when the data states no limit. */
  max: number | null
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  const isAtMax = max !== null && quantity >= max
  const isAtMin = quantity <= 1

  const decrease = () => {
    onChange(Math.max(1, quantity - 1))
  }

  const increase = () => {
    if (max === null) {
      onChange(quantity + 1)
      return
    }

    onChange(Math.min(max, quantity + 1))
  }

  const buttonClass =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-surface text-fg-base transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"

  return (
    <fieldset className={className} disabled={disabled}>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
        {t("product.quantity")}
      </legend>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={decrease}
          disabled={disabled || isAtMin}
          aria-label={t("product.quantityDecrease")}
          className={buttonClass}
          data-testid="quantity-decrease"
        >
          <Minus />
        </button>

        <span
          id={id}
          className="min-w-[3ch] text-center text-base font-semibold text-fg-base"
          aria-live="polite"
          aria-label={t("product.quantityValue", { count: quantity })}
          data-testid="quantity-value"
        >
          {quantity}
        </span>

        <button
          type="button"
          onClick={increase}
          disabled={disabled || isAtMax}
          aria-label={t("product.quantityIncrease")}
          className={buttonClass}
          data-testid="quantity-increase"
        >
          <Plus />
        </button>
      </div>

      <p className="mt-2 text-xs text-fg-muted">
        {max === null
          ? t("product.quantityUnlimited")
          : t("product.quantityMax", { count: max })}
      </p>
    </fieldset>
  )
}
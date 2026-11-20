"use client"

import { t } from "@lib/i18n/translations"
import { convertToLocale } from "@lib/util/money"
import React from "react"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    currency_code: string
    item_subtotal?: number | null
    shipping_subtotal?: number | null
    discount_subtotal?: number | null
  }
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    shipping_subtotal,
    discount_subtotal,
  } = totals

  return (
    <div>
      <div className="flex flex-col gap-y-2.5 text-sm text-[#4B5563]">
        <div className="flex items-center justify-between gap-4">
          <span>{t("cart.subtotal")}</span>
          <span
            className="font-medium text-[#111827] tabular-nums"
            data-testid="cart-subtotal"
            data-value={item_subtotal || 0}
          >
            {convertToLocale({ amount: item_subtotal ?? 0, currency_code })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>{t("cart.shipping")}</span>
          <span
            className="font-medium text-[#111827] tabular-nums"
            data-testid="cart-shipping"
            data-value={shipping_subtotal || 0}
          >
            {convertToLocale({ amount: shipping_subtotal ?? 0, currency_code })}
          </span>
        </div>
        {!!discount_subtotal && (
          <div className="flex items-center justify-between gap-4">
            <span>{t("cart.discount")}</span>
            <span
              className="font-semibold text-[#F36F21] tabular-nums"
              data-testid="cart-discount"
              data-value={discount_subtotal || 0}
            >
              -{" "}
              {convertToLocale({
                amount: discount_subtotal ?? 0,
                currency_code,
              })}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <span className="flex gap-x-1 items-center">{t("cart.taxes")}</span>
          <span
            className="font-medium text-[#111827] tabular-nums"
            data-testid="cart-taxes"
            data-value={tax_total || 0}
          >
            {convertToLocale({ amount: tax_total ?? 0, currency_code })}
          </span>
        </div>
      </div>
      <div className="my-4 h-px w-full border-b border-[#EFECE6]" />
      <div className="flex items-center justify-between gap-4 text-[#0F352E] mb-1">
        <span className="text-base font-bold">{t("cart.total")}</span>
        <span
          className="text-xl sm:text-2xl font-bold tabular-nums"
          data-testid="cart-total"
          data-value={total || 0}
        >
          {convertToLocale({ amount: total ?? 0, currency_code })}
        </span>
      </div>
    </div>
  )
}

export default CartTotals

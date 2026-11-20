"use client"

import { t } from "@lib/i18n/translations"
import { Heading, Text, clx } from "@modules/common/components/ui"

import PaymentButton from "../payment-button"
import { useSearchParams } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

const Review = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const searchParams = useSearchParams()

  const isOpen = searchParams.get("step") === "review"

  const paidByGiftcard = !!(
    (cart as unknown as Record<string, unknown>)?.gift_cards && ((cart as unknown as Record<string, unknown>)?.gift_cards as unknown[])?.length > 0 && cart?.total === 0
  )

  const previousStepsCompleted =
    cart.shipping_address &&
    (cart.shipping_methods?.length ?? 0) > 0 &&
    (cart.payment_collection || paidByGiftcard)

  return (
    <div
      className={clx(
        "rounded-2xl border bg-white p-5 sm:p-7 shadow-xs transition-all",
        isOpen ? "border-[#0F352E]/30 ring-1 ring-[#0F352E]/10" : "border-[#E7E5DF]"
      )}
    >
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={clx(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              isOpen ? "bg-[#F36F21] text-white" : "bg-[#EFECE6] text-[#6B7280]"
            )}
          >
            4
          </span>
          <Heading
            level="h2"
            className={clx(
              "flex flex-row text-xl sm:text-2xl font-bold tracking-tight gap-x-2 items-center",
              isOpen
                ? "text-[#0F352E]"
                : "text-[#9CA3AF] pointer-events-none select-none"
            )}
          >
            {t("checkout.review.title")}
          </Heading>
        </div>
      </div>
      {isOpen && previousStepsCompleted && (
        <div className="mt-6">
          <div className="flex items-start gap-x-1 w-full mb-5 rounded-xl bg-[#FAF8F4] border border-[#E7E5DF] p-4">
            <div className="w-full">
              <Text className="text-sm text-[#4B5563] leading-relaxed">
                {t("checkout.review.terms")}
              </Text>
            </div>
          </div>
          <PaymentButton cart={cart} data-testid="submit-order-button" />
        </div>
      )}
    </div>
  )
}

export default Review

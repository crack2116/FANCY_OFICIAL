"use client"
import { RadioGroup } from "@headlessui/react"
import { isStripeLike, paymentInfoMap } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import { publicErrorMessage } from "@lib/errors/public-error"
import { t } from "@lib/i18n/translations"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentContainer, {
  StripePaymentContainer,
} from "@modules/checkout/components/payment-container"
import {
  Button,
  Container,
  Heading,
  Text,
  clx,
} from "@modules/common/components/ui"
import { HttpTypes } from "@medusajs/types"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

const Payment = ({
  cart,
  availablePaymentMethods,
}: {
  cart: HttpTypes.StoreCart
  availablePaymentMethods: { id: string }[]
}) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession) => paymentSession.status === "pending"
  )

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? ""
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "payment"

  const setPaymentMethod = async (method: string) => {
    setError(null)
    setSelectedPaymentMethod(method)
    if (isStripeLike(method)) {
      await initiatePaymentSession(cart, {
        provider_id: method,
      })
    }
  }

  const paidByGiftcard = !!(
    (cart as unknown as Record<string, unknown>)?.gift_cards && ((cart as unknown as Record<string, unknown>)?.gift_cards as unknown[])?.length > 0 && cart?.total === 0
  )

  const paymentReady =
    (activeSession && (cart?.shipping_methods?.length ?? 0) !== 0) || paidByGiftcard

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const handleEdit = () => {
    router.push(pathname + "?" + createQueryString("step", "payment"), {
      scroll: false,
    })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const shouldInputPaymentDetails =
        isStripeLike(selectedPaymentMethod) && !activeSession

      const checkActiveSession =
        activeSession?.provider_id === selectedPaymentMethod

      if (!checkActiveSession) {
        await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
        })
      }

      if (!shouldInputPaymentDetails) {
        return router.push(
          pathname + "?" + createQueryString("step", "review"),
          {
            scroll: false,
          }
        )
      }
    } catch (err) {
      setError(publicErrorMessage(err, t("checkout.payment.error")))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

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
              !isOpen && paymentReady
                ? "bg-[#0F352E] text-white"
                : isOpen
                  ? "bg-[#F36F21] text-white"
                  : "bg-[#EFECE6] text-[#6B7280]"
            )}
          >
            3
          </span>
          <Heading
            level="h2"
            className={clx(
              "flex flex-row text-xl sm:text-2xl font-bold tracking-tight gap-x-2 items-center",
              !isOpen && !paymentReady
                ? "text-[#9CA3AF] pointer-events-none select-none"
                : "text-[#0F352E]"
            )}
          >
            <span>{t("checkout.payment")}</span>
            {!isOpen && paymentReady && (
              <CheckCircleSolid className="h-5 w-5 text-[#0F352E] shrink-0" />
            )}
          </Heading>
        </div>
        {!isOpen && paymentReady && (
          <Text className="shrink-0">
            <button
              type="button"
              onClick={handleEdit}
              className="text-sm font-semibold text-[#F36F21] hover:text-[#D95D14] transition-colors"
              data-testid="edit-payment-button"
            >
              {t("checkout.delivery.edit")}
            </button>
          </Text>
        )}
      </div>
      <div>
        <div className={isOpen ? "block mt-6" : "hidden"}>
          {!paidByGiftcard && availablePaymentMethods?.length && (
            <>
              <RadioGroup
                value={selectedPaymentMethod}
                onChange={(value: string) => setPaymentMethod(value)}
              >
                {availablePaymentMethods.map((paymentMethod) => (
                  <div key={paymentMethod.id}>
                    {isStripeLike(paymentMethod.id) ? (
                      <StripePaymentContainer
                        paymentProviderId={paymentMethod.id}
                        selectedPaymentOptionId={selectedPaymentMethod}
                        paymentInfoMap={paymentInfoMap}
                        setError={setError}
                        setPaymentComplete={setPaymentComplete}
                      />
                    ) : (
                      <PaymentContainer
                        paymentInfoMap={paymentInfoMap}
                        paymentProviderId={paymentMethod.id}
                        selectedPaymentOptionId={selectedPaymentMethod}
                      />
                    )}
                  </div>
                ))}
              </RadioGroup>
            </>
          )}

          {paidByGiftcard && (
            <div className="flex flex-col">
              <Text className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
                {t("checkout.payment.method")}
              </Text>
              <Text
                className="text-sm text-[#4B5563]"
                data-testid="payment-method-summary"
              >
                {t("checkout.payment.methodGiftCard")}
              </Text>
            </div>
          )}

          <ErrorMessage
            error={error}
            data-testid="payment-method-error-message"
          />

          <Button
            size="large"
            className="mt-6 h-11 rounded-xl !bg-[#0F352E] hover:!bg-[#164A40] px-6 font-semibold text-white shadow-xs"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={
              (isStripeLike(selectedPaymentMethod) && !paymentComplete) ||
              (!selectedPaymentMethod && !paidByGiftcard)
            }
            data-testid="submit-payment-button"
          >
            {!activeSession && isStripeLike(selectedPaymentMethod)
              ? t("checkout.payment.enterDetails")
              : t("checkout.payment.continue")}
          </Button>
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="mt-5 pt-5 border-t border-[#EFECE6] grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
              <div className="flex flex-col min-w-0">
                <Text className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
                  {t("checkout.payment.method")}
                </Text>
                <Text
                  className="text-sm font-medium text-[#111827] break-words"
                  data-testid="payment-method-summary"
                >
                  {paymentInfoMap[activeSession?.provider_id]?.title ||
                    activeSession?.provider_id}
                </Text>
              </div>
              <div className="flex flex-col min-w-0">
                <Text className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
                  {t("checkout.payment.details")}
                </Text>
                <div
                  className="flex gap-2 text-sm text-[#4B5563] items-center"
                  data-testid="payment-details-summary"
                >
                  <Container className="flex items-center h-8 w-fit px-2.5 bg-[#FAF8F4] border border-[#E7E5DF] rounded-lg">
                    {paymentInfoMap[selectedPaymentMethod]?.icon || (
                      <CreditCard />
                    )}
                  </Container>
                  <Text>{t("checkout.payment.anotherStep")}</Text>
                </div>
              </div>
            </div>
          ) : paidByGiftcard ? (
            <div className="mt-5 pt-5 border-t border-[#EFECE6] flex flex-col">
              <Text className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
                {t("checkout.payment.method")}
              </Text>
              <Text
                className="text-sm text-[#4B5563]"
                data-testid="payment-method-summary"
              >
                {t("checkout.payment.methodGiftCard")}
              </Text>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default Payment

"use client"
import { Radio, RadioGroup } from "@headlessui/react"
import { setShippingMethod } from "@lib/data/cart"
import { calculatePriceForShippingOption } from "@lib/data/fulfillment"
import { publicErrorMessage } from "@lib/errors/public-error"
import { t } from "@lib/i18n/translations"
import { convertToLocale } from "@lib/util/money"
import { CheckCircleSolid, Loader } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import ErrorMessage from "@modules/checkout/components/error-message"
import MedusaRadio from "@modules/common/components/radio"
import { Button, clx, Heading, Text } from "@modules/common/components/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

const PICKUP_OPTION_ON = "__PICKUP_ON"
const PICKUP_OPTION_OFF = "__PICKUP_OFF"

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
}

type ShippingMethodWithZone = HttpTypes.StoreCartShippingOption & {
  service_zone?: {
    fulfillment_set?: {
      type?: string
      location?: { address: HttpTypes.StoreCartAddress }
    }
  }
}

/**
 * Pickup methods are identified by their fulfillment set type. The zone is not
 * part of the public store DTO, hence the local widening.
 */
function isPickupMethod(method: HttpTypes.StoreCartShippingOption) {
  return (
    (method as ShippingMethodWithZone).service_zone?.fulfillment_set?.type ===
    "pickup"
  )
}

function formatAddress(address: HttpTypes.StoreCartAddress) {
  if (!address) {
    return ""
  }

  let ret = ""

  if (address.address_1) {
    ret += ` ${address.address_1}`
  }

  if (address.address_2) {
    ret += `, ${address.address_2}`
  }

  if (address.postal_code) {
    ret += `, ${address.postal_code} ${address.city}`
  }

  if (address.country_code) {
    ret += `, ${address.country_code.toUpperCase()}`
  }

  return ret
}

const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)

  const [showPickupOptions, setShowPickupOptions] =
    useState<string>(PICKUP_OPTION_OFF)
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<
    Record<string, number>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"

  const _shippingMethods = availableShippingMethods?.filter(
    (sm) => !isPickupMethod(sm)
  )

  const _pickupMethods = availableShippingMethods?.filter((sm) =>
    isPickupMethod(sm)
  )

  const hasPickupOptions = !!_pickupMethods?.length

  useEffect(() => {
    setIsLoadingPrices(true)

    // Recalculate prices when the cart or the available options change, and
    // re-evaluate the pickup panel when the selected method changes. The method
    // lists are derived here on purpose: they are recreated on every render, so
    // depending on them would loop price recalculation.
    const shippingMethods =
      availableShippingMethods?.filter((sm) => !isPickupMethod(sm)) ?? []
    const pickupMethods =
      availableShippingMethods?.filter((sm) => isPickupMethod(sm)) ?? []

    if (shippingMethods.length) {
      const promises = shippingMethods
        .filter((sm) => sm.price_type === "calculated")
        .map((sm) => calculatePriceForShippingOption(sm.id, cart.id))

      if (promises.length) {
        Promise.allSettled(promises).then((res) => {
          const pricesMap: Record<string, number> = {}
          res
            .filter((r) => r.status === "fulfilled")
            .forEach((p) => {
              if (p.value?.id) {
                pricesMap[p.value.id] = p.value.amount ?? 0
              }
            })

          setCalculatedPricesMap(pricesMap)
          setIsLoadingPrices(false)
        })
      } else {
        setIsLoadingPrices(false)
      }
    } else {
      setIsLoadingPrices(false)
    }

    if (pickupMethods.find((m) => m.id === shippingMethodId)) {
      setShowPickupOptions(PICKUP_OPTION_ON)
    }
  }, [availableShippingMethods, cart.id, shippingMethodId])

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = () => {
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const handleSetShippingMethod = async (
    id: string,
    variant: "shipping" | "pickup"
  ) => {
    setError(null)

    if (variant === "pickup") {
      setShowPickupOptions(PICKUP_OPTION_ON)
    } else {
      setShowPickupOptions(PICKUP_OPTION_OFF)
    }

    let currentId: string | null = null
    setIsLoading(true)
    setShippingMethodId((prev) => {
      currentId = prev
      return id
    })

    await setShippingMethod({ cartId: cart.id, shippingMethodId: id })
      .catch((err) => {
        setShippingMethodId(currentId)

        setError(publicErrorMessage(err, t("checkout.shipping.error")))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  const isCompleted = !isOpen && (cart.shipping_methods?.length ?? 0) > 0

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
              isCompleted
                ? "bg-[#0F352E] text-white"
                : isOpen
                  ? "bg-[#F36F21] text-white"
                  : "bg-[#EFECE6] text-[#6B7280]"
            )}
          >
            2
          </span>
          <Heading
            level="h2"
            className={clx(
              "flex flex-row text-xl sm:text-2xl font-bold tracking-tight gap-x-2 items-center",
              !isOpen && cart.shipping_methods?.length === 0
                ? "text-[#9CA3AF] pointer-events-none select-none"
                : "text-[#0F352E]"
            )}
          >
            <span>{t("checkout.delivery")}</span>
            {isCompleted && (
              <CheckCircleSolid className="h-5 w-5 text-[#0F352E] shrink-0" />
            )}
          </Heading>
        </div>
        {!isOpen &&
          cart?.shipping_address &&
          cart?.billing_address &&
          cart?.email && (
            <Text className="shrink-0">
              <button
                type="button"
                onClick={handleEdit}
                className="text-sm font-semibold text-[#F36F21] hover:text-[#D95D14] transition-colors"
                data-testid="edit-delivery-button"
              >
                {t("checkout.delivery.edit")}
              </button>
            </Text>
          )}
      </div>
      {isOpen ? (
        <div className="mt-6">
          <div className="grid">
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-[#0F352E]">
                {t("checkout.delivery.method")}
              </span>
              <span className="mb-4 text-sm text-[#6B7280]">
                {t("checkout.delivery.methodHint")}
              </span>
            </div>
            <div data-testid="delivery-options-container">
              <div className="pb-4 md:pt-0 pt-1">
                {hasPickupOptions && (
                  <RadioGroup
                    value={showPickupOptions}
                    onChange={(_value) => {
                      const id = _pickupMethods.find(
                        (option) => !option.insufficient_inventory
                      )?.id

                      if (id) {
                        handleSetShippingMethod(id, "pickup")
                      }
                    }}
                  >
                    <Radio
                      value={PICKUP_OPTION_ON}
                      data-testid="delivery-option-radio"
                      className={clx(
                        "flex items-center justify-between text-sm cursor-pointer py-3.5 border rounded-xl px-4 sm:px-5 mb-2.5 transition-colors",
                        showPickupOptions === PICKUP_OPTION_ON
                          ? "border-[#0F352E] bg-[#FAF8F4]"
                          : "border-[#E7E5DF] bg-white hover:border-[#0F352E]/40"
                      )}
                    >
                      <div className="flex items-center gap-x-3.5">
                        <MedusaRadio
                          checked={showPickupOptions === PICKUP_OPTION_ON}
                        />
                        <span className="font-medium text-[#111827]">
                          {t("checkout.delivery.pickup")}
                        </span>
                      </div>
                      <span className="justify-self-end text-[#4B5563]">
                        -
                      </span>
                    </Radio>
                  </RadioGroup>
                )}
                <RadioGroup
                  value={shippingMethodId}
                  onChange={(v) => {
                    if (v) {
                      return handleSetShippingMethod(v, "shipping")
                    }
                  }}
                >
                  {_shippingMethods?.map((option) => {
                    const isDisabled =
                      option.price_type === "calculated" &&
                      !isLoadingPrices &&
                      typeof calculatedPricesMap[option.id] !== "number"

                    return (
                      <Radio
                        key={option.id}
                        value={option.id}
                        data-testid="delivery-option-radio"
                        disabled={isDisabled}
                        className={clx(
                          "flex items-center justify-between text-sm cursor-pointer py-3.5 border rounded-xl px-4 sm:px-5 mb-2.5 transition-colors",
                          option.id === shippingMethodId
                            ? "border-[#0F352E] bg-[#FAF8F4]"
                            : "border-[#E7E5DF] bg-white hover:border-[#0F352E]/40",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-x-3.5 min-w-0">
                          <MedusaRadio
                            checked={option.id === shippingMethodId}
                          />
                          <span className="font-medium text-[#111827]">
                            {option.name}
                          </span>
                        </div>
                        <span className="justify-self-end font-semibold text-[#0F352E] tabular-nums shrink-0">
                          {option.price_type === "flat" ? (
                            convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })
                          ) : calculatedPricesMap[option.id] ? (
                            convertToLocale({
                              amount: calculatedPricesMap[option.id],
                              currency_code: cart?.currency_code,
                            })
                          ) : isLoadingPrices ? (
                            <Loader />
                          ) : (
                            "-"
                          )}
                        </span>
                      </Radio>
                    )
                  })}
                </RadioGroup>
                {!_shippingMethods?.length && !hasPickupOptions && (
                  <Text className="text-sm text-[#6B7280] py-2">
                    {t("checkout.delivery.empty")}
                  </Text>
                )}
              </div>
            </div>
          </div>

          {showPickupOptions === PICKUP_OPTION_ON && (
            <div className="grid mt-4 pt-4 border-t border-[#EFECE6]">
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-[#0F352E]">
                  {t("checkout.delivery.store")}
                </span>
                <span className="mb-4 text-sm text-[#6B7280]">
                  {t("checkout.delivery.chooseStore")}
                </span>
              </div>
              <div data-testid="delivery-options-container">
                <div className="pb-4 md:pt-0 pt-1">
                  <RadioGroup
                    value={shippingMethodId}
                    onChange={(v) => {
                      if (v) {
                        return handleSetShippingMethod(v, "pickup")
                      }
                    }}
                  >
                    {_pickupMethods?.map((option) => {
                      return (
                        <Radio
                          key={option.id}
                          value={option.id}
                          disabled={option.insufficient_inventory}
                          data-testid="delivery-option-radio"
                          className={clx(
                            "flex items-center justify-between text-sm cursor-pointer py-3.5 border rounded-xl px-4 sm:px-5 mb-2.5 transition-colors",
                            option.id === shippingMethodId
                              ? "border-[#0F352E] bg-[#FAF8F4]"
                              : "border-[#E7E5DF] bg-white hover:border-[#0F352E]/40",
                            option.insufficient_inventory &&
                              "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-start gap-x-3.5 min-w-0">
                            <MedusaRadio
                              checked={option.id === shippingMethodId}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-[#111827]">
                                {option.name}
                              </span>
                              <span className="text-xs text-[#6B7280]">
                                {formatAddress(
                                  (option as unknown as { service_zone?: { fulfillment_set?: { location?: { address: HttpTypes.StoreCartAddress } } } }).service_zone?.fulfillment_set?.location
                                    ?.address as HttpTypes.StoreCartAddress
                                )}
                              </span>
                            </div>
                          </div>
                          <span className="justify-self-end font-semibold text-[#0F352E] tabular-nums shrink-0">
                            {convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })}
                          </span>
                        </Radio>
                      )
                    })}
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          <div>
            <ErrorMessage
              error={error}
              data-testid="delivery-option-error-message"
            />
            <Button
              size="large"
              className="mt-4 h-11 rounded-xl !bg-[#0F352E] hover:!bg-[#164A40] px-6 font-semibold text-white shadow-xs"
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={!cart.shipping_methods?.[0]}
              data-testid="submit-delivery-option-button"
            >
              {t("checkout.delivery.continue")}
            </Button>
          </div>
        </div>
      ) : (
        cart &&
        (cart.shipping_methods?.length ?? 0) > 0 && (
          <div className="mt-5 pt-5 border-t border-[#EFECE6]">
            <div className="flex flex-col">
              <Text className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
                {t("checkout.delivery.methodSummary")}
              </Text>
              <Text className="text-sm font-medium text-[#111827]">
                {cart.shipping_methods!.at(-1)!.name}{" "}
                <span className="text-[#0F352E] font-semibold tabular-nums">
                  {convertToLocale({
                    amount: cart.shipping_methods!.at(-1)!.amount!,
                    currency_code: cart?.currency_code,
                  })}
                </span>
              </Text>
            </div>
          </div>
        )
      )}
    </div>
  )
}

export default Shipping

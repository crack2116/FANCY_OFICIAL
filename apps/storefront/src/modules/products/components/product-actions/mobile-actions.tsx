import { Dialog, Transition } from "@headlessui/react"
import { HttpTypes } from "@medusajs/types"
import useToggleState from "@lib/hooks/use-toggle-state"
import { t } from "@lib/i18n/translations"
import { getProductPrice } from "@lib/util/get-product-price"
import { isSimpleProduct } from "@lib/util/product"
import {
  getAvailableOptionValues,
  resolveOptionDisplayTitle,
} from "@lib/util/product-options"
import { Button, clx } from "@modules/common/components/ui"
import ChevronDown from "@modules/common/icons/chevron-down"
import X from "@modules/common/icons/x"
import React, { Fragment, useMemo } from "react"

import OptionSelect from "./option-select"

type MobileActionsProps = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  options: Record<string, string | undefined>
  updateOptions: (title: string, value: string) => void
  inStock?: boolean
  handleAddToCart: () => void
  isAdding?: boolean
  show: boolean
  optionsDisabled: boolean
}

/**
 * The sticky bar that appears once the main buy box scrolls out of view.
 *
 * It mirrors the buy box rather than replacing it: the same variant selection,
 * the same disabled-until-chosen rule and the same add handler, so a shopper who
 * taps "Agregar al carrito" from the bottom of the page cannot buy a different
 * variant than the one they were looking at.
 */
const MobileActions: React.FC<MobileActionsProps> = ({
  product,
  variant,
  options,
  updateOptions,
  inStock,
  handleAddToCart,
  isAdding,
  show,
  optionsDisabled,
}) => {
  const { state, open, close } = useToggleState()

  const price = getProductPrice({
    product: product,
    variantId: variant?.id,
  })

  const selectedPrice = useMemo(() => {
    if (!price) {
      return null
    }
    const { variantPrice, cheapestPrice } = price

    return variantPrice || cheapestPrice || null
  }, [price])

  const isSimple = isSimpleProduct(product)

  return (
    <>
      <div
        className={clx("fixed inset-x-0 bottom-0 z-50 small:hidden", {
          "pointer-events-none": !show,
        })}
      >
        <Transition
          as={Fragment}
          show={show}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-y-3 border-t border-[var(--border-subtle)] bg-surface p-4 text-base-regular"
            data-testid="mobile-actions"
          >
            <div className="flex items-center gap-x-2">
              <span data-testid="mobile-title">{product.title}</span>
              {selectedPrice ? (
                <div className="flex items-end gap-x-2 text-fg-base">
                  {selectedPrice.price_type === "sale" ? (
                    <p>
                      <span className="text-small-regular line-through text-fg-muted">
                        {selectedPrice.original_price}
                      </span>
                    </p>
                  ) : null}
                  <span
                    className={clx({
                      "text-accent-600":
                        selectedPrice.price_type === "sale",
                    })}
                  >
                    {selectedPrice.calculated_price}
                  </span>
                </div>
              ) : null}
            </div>

            <div
              className={clx("grid w-full grid-cols-2 gap-x-4", {
                "!grid-cols-1": isSimple,
              })}
            >
              {!isSimple ? (
                <Button
                  onClick={open}
                  variant="secondary"
                  className="w-full"
                  data-testid="mobile-actions-button"
                >
                  <div className="flex w-full items-center justify-between">
                    <span>
                      {variant
                        ? Object.values(options)
                            .filter(Boolean)
                            .join(" / ")
                        : t("product.selectOptions")}
                    </span>
                    <ChevronDown />
                  </div>
                </Button>
              ) : null}

              <Button
                onClick={handleAddToCart}
                disabled={!inStock || !variant}
                className="w-full"
                isLoading={isAdding}
                data-testid="mobile-cart-button"
              >
                {!variant
                  ? t("product.selectVariant")
                  : !inStock
                  ? t("product.outOfStock")
                  : t("product.addToCart")}
              </Button>
            </div>
          </div>
        </Transition>
      </div>

      <Transition appear show={state} as={Fragment}>
        <Dialog as="div" className="relative z-[75]" onClose={close}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-fg-base/50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-x-0 bottom-0">
            <div className="flex min-h-full w-full items-center justify-center text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Panel
                  className="flex h-full w-full flex-col gap-y-3 overflow-hidden text-left"
                  data-testid="mobile-actions-modal"
                >
                  <div className="flex w-full justify-end pr-6 pt-4">
                    <button
                      type="button"
                      onClick={close}
                      aria-label={t("common.close")}
                      className="flex h-11 w-11 items-center justify-center rounded-full text-fg-base"
                      data-testid="close-modal-button"
                    >
                      <X />
                    </button>
                  </div>

                  <div className="px-6 pb-12">
                    {(product.variants?.length ?? 0) > 1 ? (
                      <div className="flex flex-col gap-y-6">
                        {(product.options || []).map((option) => {
                          const availableValues = getAvailableOptionValues(
                            product,
                            option
                          )
                          if (availableValues.length === 0) {
                            return null
                          }
                          const resolvedTitle = resolveOptionDisplayTitle(
                            product,
                            option,
                            availableValues
                          )

                          return (
                            <div key={option.id}>
                              <OptionSelect
                                option={option}
                                values={availableValues}
                                current={options[option.id]}
                                updateOption={updateOptions}
                                title={resolvedTitle}
                                disabled={optionsDisabled}
                              />
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default MobileActions
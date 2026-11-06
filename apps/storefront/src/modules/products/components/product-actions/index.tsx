"use client"

import { addToCart } from "@lib/data/cart"
import { t } from "@lib/i18n/translations"
import { useIntersection } from "@lib/hooks/use-in-view"
import { getAvailableOptionValues } from "@lib/util/product"
import {
  LOW_STOCK_THRESHOLD,
  getVariantStockCap,
  isVariantPurchasable,
} from "@lib/util/stock"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import QuantityInput from "./quantity-input"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

type Feedback = { kind: "success" | "error"; message: string } | null

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

/**
 * Buy box.
 *
 * Variant selection is EXPLICIT. With more than one meaningful variant
 * ("3 kg" / "8 kg" / "15 kg") nothing is pre-selected: `options` starts empty, so
 * no variant matches, the add button stays disabled and reads "Elegir variante",
 * and the shopper has to confirm the size they want. Silently defaulting to the
 * first variant is how someone ends up paying S/ 329 for fifteen kilos they did
 * not ask for.
 *
 * The chosen variant is mirrored into `?v_id=`, which is how the server component
 * picks the right variant images. It was already there and is kept because it is
 * one `router.replace` and it is what makes the gallery follow the selection.
 */
export default function ProductActions({
  product,
  disabled,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const countryCode = useParams().countryCode as string

  // A product with exactly one variant has no decision to make, so its options
  // are filled in automatically. Anything more than one stays unselected.
  useEffect(() => {
    if (product.variants?.length === 1) {
      setOptions(optionsAsKeymap(product.variants[0].options) ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) =>
      isEqual(optionsAsKeymap(v.options), options)
    )
  }, [product.variants, options])

  const availableOptionValues = useMemo(
    () => getAvailableOptionValues(product, options),
    [product, options]
  )

  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) =>
      isEqual(optionsAsKeymap(v.options), options)
    )
  }, [product.variants, options])

  useEffect(() => {
    // Read the live query string imperatively instead of reacting to
    // `useSearchParams()`, whose object identity changes on every render and
    // would turn this into a navigation loop.
    const params = new URLSearchParams(window.location.search)
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant, pathname, router])

  const selectedVariantId = selectedVariant?.id ?? null

  /**
   * The stock ceiling for the quantity control: the selected variant's real
   * purchasable quantity, or `null` when it tracks no inventory.
   */
  const stockCap = useMemo(
    () => (selectedVariant ? getVariantStockCap(selectedVariant) : null),
    [selectedVariant]
  )

  // Changing variant means changing what is on offer: a quantity valid for the
  // 8 kg bag may not exist for the 3 kg one, so it always falls back to 1.
  useEffect(() => {
    setQuantity(1)
  }, [selectedVariantId])

  // Never let a stale quantity outlive a shrinking stock ceiling.
  useEffect(() => {
    if (stockCap !== null && quantity > stockCap) {
      setQuantity(Math.max(1, stockCap))
    }
  }, [quantity, stockCap])

  const inStock = useMemo(() => {
    if (!selectedVariant) {
      return false
    }

    return isVariantPurchasable(selectedVariant)
  }, [selectedVariant])

  /**
   * "Pocas unidades" uses the same threshold as the product card, read from the
   * one shared constant. Before selecting a variant nothing is claimed: an
   * unselected product has no single stock figure to report.
   */
  const isLowStock =
    stockCap !== null && stockCap > 0 && stockCap <= LOW_STOCK_THRESHOLD

  const actionsRef = useRef<HTMLDivElement>(null)
  const inView = useIntersection(actionsRef, "0px")

  const handleAddToCart = useCallback(async () => {
    if (!selectedVariantId) {
      return
    }

    setIsAdding(true)
    setFeedback(null)

    try {
      await addToCart({
        variantId: selectedVariantId,
        quantity,
        countryCode,
      })

      // Confirmation in place: the shopper stays on the product page, which is
      // where they still have the cart dropdown and the rest of the range in
      // reach. No forced redirect to a page they did not ask for.
      setFeedback({ kind: "success", message: t("product.addedToCart") })
    } catch {
      // The backend's message can be a Medusa error object or a stack; neither
      // helps a shopper, so it is dropped and replaced with something actionable.
      setFeedback({ kind: "error", message: t("product.addToCartError") })
    } finally {
      setIsAdding(false)
    }
  }, [countryCode, quantity, selectedVariantId])

  return (
    <>
      <div
        className="flex flex-col gap-y-4 rounded-2xl border border-[#eadfce] bg-white p-5 shadow-[var(--shadow-card)]"
        ref={actionsRef}
      >
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                      availableValues={availableOptionValues[option.id]}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        <ProductPrice product={product} variant={selectedVariant} />

        {inStock ? (
          <p
            className={
              isLowStock
                ? "inline-flex w-fit items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                : "inline-flex w-fit items-center gap-2 rounded-full bg-success-50 px-3 py-1 text-xs font-semibold text-success-700"
            }
            data-testid="product-stock-state"
          >
            <span
              aria-hidden="true"
              className={
                isLowStock
                  ? "h-1.5 w-1.5 rounded-full bg-brand-500"
                  : "h-1.5 w-1.5 rounded-full bg-success-500"
              }
            />
            {isLowStock ? t("product.lowStock") : t("product.inStock")}
          </p>
        ) : null}

        {inStock ? (
          <QuantityInput
            quantity={quantity}
            onChange={setQuantity}
            max={stockCap}
            disabled={!!disabled || isAdding}
          />
        ) : null}

        <Button
          onClick={handleAddToCart}
          disabled={
            !inStock ||
            !selectedVariant ||
            !!disabled ||
            isAdding ||
            !isValidVariant
          }
          variant="primary"
          className="h-12 w-full text-sm font-semibold"
          isLoading={isAdding}
          data-testid="add-product-button"
        >
          {!selectedVariant || !isValidVariant
            ? t("product.selectVariant")
            : !inStock
            ? t("product.outOfStock")
            : t("product.addToCart")}
        </Button>

        {feedback ? (
          <p
            role="status"
            aria-live="polite"
            className={
              feedback.kind === "success"
                ? "text-sm font-medium text-success-700"
                : "text-sm font-medium text-danger-700"
            }
            data-testid="add-to-cart-feedback"
          >
            {feedback.message}
          </p>
        ) : null}

        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}
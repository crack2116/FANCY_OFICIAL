/**
 * The line items of an order, rendered from the ORDER'S OWN SNAPSHOT.
 *
 * WHY THE SNAPSHOT AND NOT TODAY'S PRODUCT
 * Every value below — title, variant title, thumbnail, unit price — is read from
 * the order item row, which Medusa writes when the order is placed and never
 * rewrites. So an order from last year keeps showing the name and the price the
 * shopper actually paid, even after the product is renamed, repriced or
 * deleted. Refetching the product would silently rewrite history, and a deleted
 * product would turn this page into an error.
 *
 * Consequently nothing here can fail because a product is gone: there is no
 * product lookup, and `thumbnail` may be `null`, which falls back to a neutral
 * placeholder rather than a broken image.
 *
 * LAYOUT
 * A card list at every width: a four-column table is unreadable at 390px and this
 * is the page a shopper most often opens on a phone.
 */

import Image from "next/image"
import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import { convertToLocale } from "@lib/util/money"
import PlaceholderImage from "@modules/common/icons/placeholder-image"

/**
 * The variant as recorded on the order.
 *
 * `variant_title` is the snapshot column. `variant` (the live relation) is only
 * consulted as a fallback and is optional, so a removed variant still renders.
 * Medusa's own default variant is titled "Default", which means nothing to a
 * shopper, so it is treated as "no variant chosen".
 */
function variantLabel(item: HttpTypes.StoreOrderLineItem): string | null {
  const fromSnapshot = item.variant_title?.trim()

  if (fromSnapshot && fromSnapshot.toLowerCase() !== "default") {
    return fromSnapshot
  }

  const fromRelation = item.variant?.title?.trim()

  if (fromRelation && fromRelation.toLowerCase() !== "default") {
    return fromRelation
  }

  return null
}

const ItemImage = ({
  thumbnail,
  title,
}: {
  thumbnail: string | null
  title: string
}) => {
  const alt = t("account.order.item.imageAlt", { title })

  return (
    <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-md bg-ui-bg-subtle border border-gray-200">
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt={alt}
          fill
          sizes="64px"
          className="object-cover object-center"
        />
      ) : (
        <span
          className="w-full h-full flex items-center justify-center"
          role="img"
          aria-label={t("account.order.item.noImage")}
        >
          <PlaceholderImage size={24} />
        </span>
      )}
    </div>
  )
}

const OrderItems = ({
  items,
  currencyCode,
}: {
  items: HttpTypes.StoreOrderLineItem[]
  currencyCode: string
}) => {
  if (!items.length) {
    return (
      <p className="text-base-regular text-fg-base" data-testid="order-items-empty">
        {t("empty.state.title")}
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-y-6 list-none p-0 m-0" data-testid="order-items">
      {items.map((item) => {
        const variant = variantLabel(item)

        // `subtotal` is the line total excluding tax — what a shopper reads as
        // "this item × this many". The multiplication fallback only applies when
        // the order recorded no subtotal at all.
        const lineTotal =
          typeof item.subtotal === "number" && item.subtotal > 0
            ? item.subtotal
            : (item.unit_price ?? 0) * (item.quantity ?? 0)

        return (
          <li key={item.id} className="flex gap-4 items-start" data-testid="order-item">
            <ItemImage thumbnail={item.thumbnail ?? null} title={item.title} />
            <div className="flex flex-col gap-y-1 min-w-0 flex-1">
              <span className="text-base-regular font-semibold" data-testid="item-title">
                {item.title}
              </span>
              <span className="text-small-regular text-ui-fg-subtle" data-testid="item-variant">
                {t("account.order.item.variantLabel")}:{" "}
                {variant ?? t("account.order.item.defaultVariant")}
              </span>
              <span className="text-small-regular text-ui-fg-subtle" data-testid="item-quantity">
                {t("account.order.item.quantity")}: {item.quantity}
              </span>
            </div>
            <div className="flex flex-col items-end shrink-0 gap-y-1">
              <span className="text-small-regular text-ui-fg-subtle" data-testid="item-unit-price">
                {t("account.order.item.unitPrice")}:{" "}
                {convertToLocale({
                  amount: item.unit_price ?? 0,
                  currency_code: currencyCode,
                })}
              </span>
              <span className="text-base-regular font-semibold" data-testid="item-subtotal">
                {convertToLocale({ amount: lineTotal, currency_code: currencyCode })}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default OrderItems
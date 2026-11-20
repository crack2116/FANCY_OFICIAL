"use client"

import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"

import Accordion from "./accordion"

/**
 * Product information, as two Spanish accordions.
 *
 * Both panels show ONLY fields the API returned. `material`, `origin_country`
 * and `type` are empty for the demo catalogue, and they read "No informado"
 * rather than being filled in — a product page that invents a country of origin
 * is worse than one that admits it does not have the data.
 *
 * There is deliberately no "Shipping & Returns" panel. The upstream starter
 * shipped one promising "3-5 business days", "no questions asked" refunds and
 * free exchanges. None of those policies exist in this project, so the panel is
 * gone rather than translated: translating a fabricated policy is still a
 * fabricated policy.
 */
const ProductTabs = ({ product }: { product: HttpTypes.StoreProduct }) => {
  const tabs = [
    {
      key: "description",
      label: t("product.descriptionHeading"),
      component: <DescriptionTab product={product} />,
    },
    {
      key: "details",
      label: t("product.detailsHeading"),
      component: <DetailsTab product={product} />,
    },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple">
        {tabs.map((tab) => (
          <Accordion.Item
            key={tab.key}
            title={tab.label}
            headingSize="medium"
            value={tab.key}
          >
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

const notReported = t("product.detailsNotReported")

const DescriptionTab = ({ product }: { product: HttpTypes.StoreProduct }) => {
  if (!product.description) {
    return (
      <p className="py-6 text-sm text-fg-subtle" data-testid="product-description">
        {notReported}
      </p>
    )
  }

  return (
    <div className="py-6 text-sm leading-relaxed text-fg-subtle">
      <p className="whitespace-pre-line" data-testid="product-description">
        {product.description}
      </p>
    </div>
  )
}

const DetailsTab = ({ product }: { product: HttpTypes.StoreProduct }) => {
  const details = [
    { label: t("product.detailsMaterial"), value: product.material },
    { label: t("product.detailsOrigin"), value: product.origin_country },
    { label: t("product.detailsType"), value: product.type?.value },
    {
      label: t("product.detailsWeight"),
      value: product.weight
        ? product.weight >= 1000
          ? `${Number((product.weight / 1000).toFixed(2))} kg`
          : `${product.weight} g`
        : null,
    },
    {
      label: t("product.detailsDimensions"),
      value:
        product.length && product.width && product.height
          ? `${product.length} x ${product.width} x ${product.height} cm`
          : null,
    },
  ]

  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 py-6 xsmall:grid-cols-2">
      {details.map((detail) => (
        <div key={detail.label}>
          <dt className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            {detail.label}
          </dt>
          <dd className="mt-1 text-sm text-fg-base">
            {detail.value || notReported}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default ProductTabs
import { t } from "@lib/i18n/translations"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"

type LineItemOptionsProps = {
  variant: HttpTypes.StoreProductVariant | undefined
  "data-testid"?: string
  "data-value"?: HttpTypes.StoreProductVariant
}

function resolveLineItemOptionLabel(variantTitle?: string | null): string {
  const value = (variantTitle ?? "").trim()
  if (/\b(kg|kilo|kilos|g|gr|gramos?)\b/i.test(value)) {
    return "Peso"
  }
  if (/\b(ml|l|lt|litros?)\b/i.test(value)) {
    return "Volumen"
  }
  if (/^(xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl)$/i.test(value)) {
    return "Talla"
  }
  return t("product.variant")
}

const LineItemOptions = ({
  variant,
  "data-testid": dataTestid,
  "data-value": dataValue,
}: LineItemOptionsProps) => {
  const title = variant?.title?.trim()
  if (!title || title.toLowerCase() === "default option value") {
    return null
  }

  const label = resolveLineItemOptionLabel(title)

  return (
    <Text
      data-testid={dataTestid}
      data-value={dataValue}
      className="inline-block w-full truncate text-xs text-fg-subtle"
    >
      {label}: <span className="font-medium text-fg-base">{title}</span>
    </Text>
  )
}

export default LineItemOptions

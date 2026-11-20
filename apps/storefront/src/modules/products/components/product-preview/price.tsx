import { VariantPrice } from "types/global"

function formatPenDisplay(raw?: string | null): string {
  if (!raw) {
    return ""
  }
  return raw
    .replace(/^PEN\s*/i, "S/ ")
    .replace(/^S\/\s*/, "S/ ")
    .trim()
}

export default function PreviewPrice({
  price,
  compareAtPrice,
}: {
  price: VariantPrice
  compareAtPrice?: string | null
}) {
  if (!price) {
    return null
  }

  const isSale = price.price_type === "sale"
  const mainPrice = formatPenDisplay(price.calculated_price)
  const strikePrice = formatPenDisplay(
    compareAtPrice || (isSale ? price.original_price : null)
  )

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span
        className="font-display text-lg font-extrabold tracking-tight text-[#0E352E] small:text-[21px]"
        data-testid="price"
      >
        {mainPrice}
      </span>

      {strikePrice && strikePrice !== mainPrice ? (
        <span
          className="text-xs font-semibold text-slate-400 line-through"
          data-testid="original-price"
        >
          {strikePrice}
        </span>
      ) : null}
    </div>
  )
}

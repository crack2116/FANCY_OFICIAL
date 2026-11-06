import { VariantPrice } from "types/global"

/**
 * Card price block. Renders the struck-through original price and a
 * percentage badge only when the backend reports a sale price, so nothing is
 * implied that the data does not support.
 *
 * THE PRICE IS BRAND ORANGE, SALE OR NOT. That is the one deliberate departure
 * from "ink means price": the reference draws every price in the brand orange
 * and the number has to be the loudest thing on the card. `--brand-700` rather
 * than `--brand-500`, because 500 is a decorative orange that fails text
 * contrast on white and 700 is the step this palette already uses for
 * interactive product text.
 */
export default function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  const isSale = price.price_type === "sale"

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {isSale ? (
        <span
          className="text-xs text-fg-muted line-through"
          data-testid="original-price"
        >
          {price.original_price}
        </span>
      ) : null}

      <span
        className="text-base font-bold text-brand-700"
        data-testid="price"
      >
        {price.calculated_price}
      </span>

      {/*
       * NO percentage here, deliberately.
       *
       * It used to render a second "-20%" right beside the price, while the
       * card ALSO draws the same figure as a corner pill over the image. Two
       * copies of the same number on one card reads as a rendering fault rather
       * than emphasis, and the reference carries it once, in the corner. The
       * figure still comes from the backend either way — this only decides where
       * it is shown, never whether it is true.
       */}
    </div>
  )
}
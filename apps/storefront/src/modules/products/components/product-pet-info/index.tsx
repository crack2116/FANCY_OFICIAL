import { t } from "@lib/i18n/translations"
import {
  lifeStageLabel,
  petSizeLabel,
  productSpeciesCodes,
  readProductPetData,
  speciesLabel,
} from "@lib/pet-product"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * "Información del producto": who makes it, and what it is made for.
 *
 * THIS IS NOT A TABLE OF "N/A".
 * ---------------------------------
 * Every row is built only from a value that exists. A product with no brand, no
 * profile, or a profile that names no species renders the rows it has and stops.
 * The alternative — always four rows, each falling back to "No informado" — is
 * worse in a specific way: once three of four rows say "No informado", the one
 * row that does carry a value stops being read as information. The omission is
 * the honest rendering of absence, and it is why this is a component that builds
 * an array rather than a template.
 *
 * COMMERCIAL, NOT CLINICAL
 * ------------------------
 * Species, life stage and size are how a product is SOLD, not what it treats.
 * Nothing here recommends treating, curing or preventing anything, and there is
 * no copy telling a shopper the product is right for their animal. This panel
 * states what the product is for; the veterinary judgement stays with the
 * consumer and their vet. `petDataHint` in the Admin says the same thing to the
 * operator who typed these values.
 */
export default function ProductPetInfo({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const { brand, profile } = readProductPetData(product)

  const speciesCodes = productSpeciesCodes(profile)
  const species = speciesCodes.map(speciesLabel).join(", ")

  const lifeStage = lifeStageLabel(profile?.life_stage)
  const petSize = petSizeLabel(profile?.pet_size)

  /**
   * Only real values become rows. `filter(Boolean)` drops a null label, which is
   * what happens when the stored enum is one this build cannot name — the row
   * disappears instead of rendering a raw token.
   */
  const rows = [
    brand ? { key: "brand", label: t("product.petInfo.brandLabel"), value: brand.name } : null,
    species ? { key: "species", label: t("product.petInfo.speciesLabel"), value: species } : null,
    lifeStage
      ? { key: "lifeStage", label: t("product.petInfo.lifeStageLabel"), value: lifeStage }
      : null,
    petSize ? { key: "petSize", label: t("product.petInfo.petSizeLabel"), value: petSize } : null,
  ].filter((row): row is { key: string; label: string; value: string } => row !== null)

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="mt-6" data-testid="product-pet-info">
      <h2 className="text-sm font-semibold text-fg-base">
        {t("product.petInfo.heading")}
      </h2>

      <dl className="mt-3 flex flex-col gap-y-3">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-col gap-y-0.5">
            <dt className="text-xs uppercase tracking-wider text-fg-muted">
              {row.label}
            </dt>
            <dd className="text-sm text-fg-base">
              {/*
                The brand is the one row that links. Its destination is the brand
                page, and the label spells out where it goes so the link is not
                read as another heading.
              */}
              {row.key === "brand" && brand ? (
                <LocalizedClientLink
                  href={`/marcas/${brand.handle}`}
                  className="underline underline-offset-4 transition-colors hover:text-brand-700"
                  aria-label={t("product.petInfo.viewBrand", { brand: brand.name })}
                >
                  {row.value}
                </LocalizedClientLink>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
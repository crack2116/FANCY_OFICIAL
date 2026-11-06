import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Heading, Hint, Label, Select, toast } from "@medusajs/ui"
import { useParams } from "react-router-dom"
import { useState } from "react"

import { inspectAdminError, toAdminErrorMessage } from "../lib/admin-api"
import { copy } from "../lib/admin-copy"
import {
  assignableBrands,
  useAssignProductBrand,
  useBrands,
  useProductPetData,
  useRemoveProductBrand,
} from "../lib/admin-queries"
import { ConfirmedAction, Section } from "../lib/admin-ui"

/**
 * The product's brand, in the product details sidebar.
 *
 * The product id comes from the route, not from a prop. The dashboard composes
 * widgets through `LayoutComposer`, and a prop would couple this component to
 * how the layout happens to forward data; `useParams` reads the same id the page
 * itself is rendering and cannot disagree with it.
 *
 * Only ACTIVE brands are offered, because the assignment workflow rejects an
 * inactive one. Offering it would produce a 400 the operator cannot act on.
 *
 * Every write goes through `/admin/products/:id/brand`. Nothing here touches a
 * database, a service or a workflow directly.
 */
const ProductBrandWidget = () => {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading } = useProductPetData(id)
  const brandsQuery = useBrands(true)

  const assign = useAssignProductBrand(id as string)
  const remove = useRemoveProductBrand(id as string)

  const currentBrand = data?.brand ?? null
  const [selected, setSelected] = useState("")

  const options = assignableBrands(brandsQuery.data?.brands)

  /**
   * A brand that was assigned but is not in the active list — deactivated after
   * the link was made. It is still shown as the current value, because hiding it
   * would make the widget claim the product has no brand while the storefront
   * keeps displaying it.
   */
  const selectedValue = currentBrand?.id ?? selected
  const hasStaleSelection =
    Boolean(currentBrand) && !currentBrand?.is_active

  const save = () => {
    if (!selected) {
      return
    }

    assign.mutate(
      { brand_id: selected },
      {
        onSuccess: () => {
          setSelected("")
          toast.success(copy("productBrandAssigned"))
        },
        onError: (error) => {
          const { code, status } = inspectAdminError(error)
          console.error(
            `[admin/product-brand] assign failed (code=${code} status=${status ?? "none"})`
          )
          toast.error(toAdminErrorMessage(error))
        },
      }
    )
  }

  const handleRemove = () => {
    remove.mutate(undefined, {
      onSuccess: () => toast.success(copy("productBrandRemoved")),
      onError: (error) => {
        const { code, status } = inspectAdminError(error)
        console.error(
          `[admin/product-brand] remove failed (code=${code} status=${status ?? "none"})`
        )
        toast.error(toAdminErrorMessage(error))
      },
    })
  }

  return (
    <Section data-testid="admin-product-brand-widget">
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <Heading level="h2">{copy("productBrandHeading")}</Heading>

        {isLoading ? (
          <p className="text-sm text-fg-subtle">{copy("loading")}</p>
        ) : null}

        {!isLoading && !currentBrand ? (
          <Hint>{copy("productBrandEmptyHint")}</Hint>
        ) : null}

        {currentBrand ? (
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-y-0.5">
              <span className="text-sm text-fg-base">{currentBrand.name}</span>
              <code className="text-xs text-fg-muted">{currentBrand.handle}</code>
            </div>

            <ConfirmedAction
              trigger={copy("productBrandRemoveAction")}
              confirmLabel={copy("productBrandRemoveAction")}
              title={copy("productBrandRemoveConfirmTitle")}
              body={copy("productBrandRemoveConfirmBody")}
              isPending={remove.isPending}
              onConfirm={handleRemove}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-y-1.5">
          <Label size="small" htmlFor="admin-product-brand-select">
            {copy("productBrandSelectLabel")}
          </Label>

          <Select value={selectedValue} onValueChange={setSelected} size="small">
            <Select.Trigger id="admin-product-brand-select">
              <Select.Value placeholder={copy("productBrandSelectEmpty")} />
            </Select.Trigger>

            <Select.Content>
              {options.map((brand) => (
                <Select.Item key={brand.id} value={brand.id}>
                  {brand.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        {hasStaleSelection ? (
          <Hint variant="error">{copy("productBrandUnavailable")}</Hint>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="primary"
            onClick={save}
            disabled={!selected || assign.isPending}
            isLoading={assign.isPending}
          >
            {copy("productBrandSave")}
          </Button>
        </div>
      </div>
    </Section>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductBrandWidget
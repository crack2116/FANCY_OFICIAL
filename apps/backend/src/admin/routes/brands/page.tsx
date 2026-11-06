import { Button, Input, Table } from "@medusajs/ui"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Link, useNavigate } from "react-router-dom"
import { useMemo, useState } from "react"

import { toAdminErrorMessage } from "../../lib/admin-api"
import { copy } from "../../lib/admin-copy"
import { useBrands, useSetBrandActive } from "../../lib/admin-queries"
import {
  ConfirmedAction,
  EmptyState,
  ErrorState,
  PageHeader,
  Section,
  StatusPill,
} from "../../lib/admin-ui"

/**
 * The brand list.
 *
 * NO PRODUCT COUNT COLUMN. `GET /admin/brands` returns `{ brands, count,
 * offset, limit }` and no per-brand product count — see the route's `BRAND_FIELDS`
 * allow-list. Counting here would mean listing the whole catalogue on every
 * render of this page, so the column simply does not exist rather than showing a
 * number that would be wrong.
 *
 * NO DELETE BUTTON. The API exposes activate/deactivate and no delete, and
 * deactivate is the correct operator action anyway: a brand keeps its handle, its
 * product links and its history, so deactivating never orphans a product or
 * breaks a published URL.
 *
 * The search box filters the loaded page client-side. The API supports a
 * server-side `q`, but this list is bounded at 200 rows and filtering locally
 * keeps typing instant while the `q` request would re-fetch on every keystroke.
 */
const BrandsPage = () => {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useBrands()
  const setActive = useSetBrandActive()
  const [search, setSearch] = useState("")

  const brands = data?.brands ?? []

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()

    if (!needle) {
      return brands
    }

    return brands.filter(
      (brand) =>
        brand.name.toLowerCase().includes(needle) ||
        brand.handle.includes(needle)
    )
  }, [brands, search])

  if (isLoading) {
    return (
      <Section className="px-6 py-8 text-sm text-fg-subtle">{copy("loading")}</Section>
    )
  }

  if (isError) {
    return <ErrorState message={toAdminErrorMessage(error)} onRetry={() => refetch()} />
  }

  return (
    <div className="flex flex-col" data-testid="admin-brands-page">
      <PageHeader
        title={copy("brandsHeading")}
        description={copy("brandsSubtitle")}
        actions={
          <Button
            size="small"
            variant="primary"
            onClick={() => navigate("/brands/create")}
            data-testid="admin-brands-create"
          >
            {copy("brandCreateAction")}
          </Button>
        }
      />

      {brands.length === 0 ? (
        <EmptyState
          title={copy("brandsEmptyTitle")}
          description={copy("brandsEmptyDescription")}
          action={
            <Button
              size="small"
              variant="primary"
              onClick={() => navigate("/brands/create")}
            >
              {copy("brandCreateAction")}
            </Button>
          }
        />
      ) : (
        <Section className="border-t border-ui-border-base">
          <div className="flex flex-col gap-y-4 px-6 py-4">
            <div className="flex max-w-sm flex-col gap-y-1.5">
              <label
                htmlFor="admin-brands-search"
                className="text-xs font-medium text-fg-subtle"
              >
                {copy("brandsSearchLabel")}
              </label>
              <Input
                id="admin-brands-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy("brandsSearchPlaceholder")}
                autoComplete="off"
              />
            </div>

            {visible.length === 0 ? (
              <p className="text-sm text-fg-subtle">{copy("brandsNoResults")}</p>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>{copy("brandsColumnName")}</Table.HeaderCell>
                    <Table.HeaderCell>{copy("brandsColumnHandle")}</Table.HeaderCell>
                    <Table.HeaderCell>{copy("brandsColumnStatus")}</Table.HeaderCell>
                    <Table.HeaderCell className="text-right">
                      {copy("brandsColumnActions")}
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {visible.map((brand) => (
                    <Table.Row key={brand.id}>
                      <Table.Cell>
                        <span className="text-sm text-fg-base">{brand.name}</span>
                      </Table.Cell>

                      <Table.Cell>
                        <code className="text-xs text-fg-muted">{brand.handle}</code>
                      </Table.Cell>

                      <Table.Cell>
                        <StatusPill isActive={brand.is_active} />
                      </Table.Cell>

                      <Table.Cell className="flex items-center justify-end gap-2">
                        <Button size="small" variant="transparent" asChild>
                          <Link to={`/brands/${brand.id}`}>{copy("brandActionEdit")}</Link>
                        </Button>

                        <ConfirmedAction
                          trigger={
                            brand.is_active
                              ? copy("brandActionDeactivate")
                              : copy("brandActionActivate")
                          }
                          confirmLabel={
                            brand.is_active
                              ? copy("brandActionDeactivate")
                              : copy("brandActionActivate")
                          }
                          title={
                            brand.is_active
                              ? copy("brandDeactivateConfirmTitle")
                              : copy("brandActivateConfirmTitle")
                          }
                          body={
                            brand.is_active
                              ? copy("brandDeactivateConfirmBody")
                              : copy("brandActivateConfirmBody")
                          }
                          note={
                            brand.is_active ? copy("brandDeactivateConfirmNote") : undefined
                          }
                          variant="secondary"
                          isPending={setActive.isPending}
                          onConfirm={() =>
                            setActive.mutate({ id: brand.id, isActive: !brand.is_active })
                          }
                        />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}

            <p className="text-xs text-fg-muted" aria-live="polite">
              {visible.length === 1
                ? copy("brandsResultCountOne")
                : copy("brandsResultCount", { count: visible.length })}
            </p>
          </div>
        </Section>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: copy("brandsMenuLabel"),
  nested: "/products",
  rank: 20,
})

export default BrandsPage
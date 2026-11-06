import { Button, Container, Heading, Hint, toast } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"

import { BrandForm, reportSaveOutcome } from "../../../lib/brand-form"
import { inspectAdminError, retrieveBrand, toAdminErrorMessage } from "../../../lib/admin-api"
import { copy } from "../../../lib/admin-copy"
import {
  useSetBrandActive,
  useUpdateBrand,
} from "../../../lib/admin-queries"
import {
  ConfirmedAction,
  ErrorState,
  PageHeader,
  Section,
  StatusPill,
} from "../../../lib/admin-ui"

/**
 * Edit one brand.
 *
 * The record is fetched on its own rather than read from a list cache: an edit
 * screen that renders a stale list entry would happily save yesterday's name
 * over today's. `GET /admin/brands/:id` returns `{ brand }` and 404s with a
 * Medusa error, which the safe layer turns into one Spanish sentence.
 *
 * Status is deliberately NOT part of the form. Activation and deactivation have
 * their own endpoints (`/activate`, `/deactivate`) so an operator can be granted
 * one write scope without the other, so they are separate actions here too
 * rather than a checkbox that quietly posts to PATCH.
 */
const EditBrandPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["brands", "detail", id],
    queryFn: () => retrieveBrand(id as string),
    enabled: Boolean(id),
  })

  const updateBrand = useUpdateBrand()
  const setActive = useSetBrandActive()

  const brand = data?.brand

  if (isLoading) {
    return (
      <Section className="px-6 py-8 text-sm text-fg-subtle">{copy("loading")}</Section>
    )
  }

  if (isError || !brand) {
    return (
      <ErrorState
        message={toAdminErrorMessage(error)}
        onRetry={() => refetch()}
      />
    )
  }

  const handleSave = (input: {
    name: string
    handle?: string
    description: string | null
    logo_url: string | null
    is_active: boolean
  }) => {
    // The form carries the status for the create screen, where it decides the
    // initial state. Here status is managed by activate/deactivate, so it is
    // dropped rather than re-posted on every save.
    const { is_active: _ignoredStatus, ...editable } = input

    updateBrand.mutate(
      { id: brand.id, input: editable },
      {
        onSuccess: () => {
          reportSaveOutcome({
            isError: false,
            error: null,
            successMessage: copy("brandUpdated"),
            onSuccess: () => undefined,
          })
        },
        onError: (mutationError) => {
          reportSaveOutcome({
            isError: true,
            error: mutationError,
            successMessage: copy("brandUpdated"),
            onSuccess: () => undefined,
          })
        },
      }
    )
  }

  const handleToggleActive = (isActive: boolean) => {
    setActive.mutate(
      { id: brand.id, isActive },
      {
        onSuccess: () => {
          toast.success(
            isActive ? copy("brandActivated") : copy("brandDeactivated")
          )
        },
        onError: (mutationError) => {
          const { code, status } = inspectAdminError(mutationError)
          console.error(
            `[admin/brands] status change failed (code=${code} status=${status ?? "none"})`
          )

          toast.error(toAdminErrorMessage(mutationError))
        },
      }
    )
  }

  return (
    <div className="flex flex-col" data-testid="admin-brand-edit-page">
      <PageHeader
        title={brand.name}
        description={copy("brandsSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Button size="small" variant="secondary" onClick={() => navigate("/brands")}>
              {copy("brandShowAll")}
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
              note={brand.is_active ? copy("brandDeactivateConfirmNote") : undefined}
              isPending={setActive.isPending}
              onConfirm={() => handleToggleActive(!brand.is_active)}
            />
          </div>
        }
      />

      <Section className="flex flex-col gap-y-4 border-t border-ui-border-base px-6 py-4">
        <div className="flex items-center gap-3">
          <Heading level="h3">{copy("brandsColumnStatus")}</Heading>
          <StatusPill isActive={brand.is_active} />
        </div>

        <Hint>{copy("brandFieldStatusHint")}</Hint>

        <p className="text-sm text-fg-subtle">
          <span className="text-xs uppercase tracking-wider text-fg-muted">
            {copy("brandsColumnHandle")}
          </span>
          <span className="ml-2">
            /pe/marcas/{brand.handle}
          </span>
        </p>
      </Section>

      <Section className="border-t border-ui-border-base">
        <Container className="px-6 py-6">
          <BrandForm
            brand={brand}
            isSaving={updateBrand.isPending}
            onSave={handleSave}
            onCancel={() => navigate("/brands")}
          />
        </Container>
      </Section>
    </div>
  )
}

export default EditBrandPage
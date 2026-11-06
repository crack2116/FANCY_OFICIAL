import { Button, Container } from "@medusajs/ui"
import { useNavigate } from "react-router-dom"

import { BrandForm, reportSaveOutcome } from "../../../lib/brand-form"
import { copy } from "../../../lib/admin-copy"
import { useCreateBrand } from "../../../lib/admin-queries"
import { PageHeader, Section } from "../../../lib/admin-ui"

/**
 * Create a brand.
 *
 * The handle is left blank by default so the API derives it from the name: an
 * operator who has never seen a slug should not have to invent one, and the
 * field shows the handle the name will produce before they save.
 *
 * On success this navigates to the brand's own screen rather than back to the
 * list, so the operator lands on the record they just created and can see its
 * status and its storefront URL.
 */
const CreateBrandPage = () => {
  const navigate = useNavigate()
  const createBrand = useCreateBrand()

  const handleSave = (input: {
    name: string
    handle?: string
    description: string | null
    logo_url: string | null
    is_active: boolean
  }) => {
    createBrand.mutate(input, {
      onSuccess: (data) => {
        reportSaveOutcome({
          isError: false,
          error: null,
          successMessage: copy("brandCreated"),
          onSuccess: () => navigate(`/brands/${data.brand.id}`),
        })
      },
      onError: (error) => {
        reportSaveOutcome({
          isError: true,
          error,
          successMessage: copy("brandCreated"),
          onSuccess: () => navigate("/brands"),
        })
      },
    })
  }

  return (
    <div className="flex flex-col" data-testid="admin-brand-create-page">
      <PageHeader
        title={copy("brandCreateHeading")}
        description={copy("brandsSubtitle")}
        actions={
          <Button size="small" variant="secondary" onClick={() => navigate("/brands")}>
            {copy("brandCancel")}
          </Button>
        }
      />

      <Section className="border-t border-ui-border-base">
        <Container className="px-6 py-6">
          <BrandForm
            isSaving={createBrand.isPending}
            onSave={handleSave}
            onCancel={() => navigate("/brands")}
          />
        </Container>
      </Section>
    </div>
  )
}

export default CreateBrandPage
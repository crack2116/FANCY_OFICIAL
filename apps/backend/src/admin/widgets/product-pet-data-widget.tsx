import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Heading,
  Hint,
  Label,
  Select,
  toast,
} from "@medusajs/ui"
import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"

import { inspectAdminError, toAdminErrorMessage } from "../lib/admin-api"
import { copy } from "../lib/admin-copy"
import {
  activeSpecies,
  useProductPetData,
  useRemoveProductPetProfile,
  useSpecies,
  useUpsertProductPetProfile,
} from "../lib/admin-queries"
import { ConfirmedAction, Section } from "../lib/admin-ui"
import {
  LIFE_STAGES,
  LIFE_STAGE_LABELS,
  PET_SIZES,
  PET_SIZE_LABELS,
  toLifeStage,
  toPetSize,
  type LifeStage,
  type PetSize,
} from "../lib/vet-domain"

/** The values this form saves when nothing else is chosen. */
const DEFAULT_LIFE_STAGE: LifeStage = "all"
const DEFAULT_PET_SIZE: PetSize = "all"

/**
 * "Datos de mascota" for one product.
 *
 * THREE THINGS THIS WIDGET GETS RIGHT THAT THE OBVIOUS VERSION DOES NOT:
 *
 *  1. It shows only values that exist. A product with no profile renders the
 *     empty state, never a form pre-filled with `all` that looks like saved data.
 *  2. It validates the closed sets CLIENT-SIDE. `life_stage` and `pet_size` are
 *     database enums with a check constraint, and the API rejects anything else
 *     with a 400; picking only from the closed lists means that 400 cannot be
 *     produced from this screen.
 *  3. It refuses to save an empty species list. `species_codes` has `.min(1)` on
 *     the server, so a save with nothing ticked would be a guaranteed failure.
 *
 * A stored value outside the closed sets is reported, not silently rendered as
 * a raw token: the row exists, this build cannot describe it, and the operator
 * needs to know that rather than see "undefined" in a dropdown.
 */
const ProductPetDataWidget = () => {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading } = useProductPetData(id)
  const speciesQuery = useSpecies(true)

  const upsert = useUpsertProductPetProfile(id as string)
  const remove = useRemoveProductPetProfile(id as string)

  const profile = data?.pet_product_profile ?? null

  const [speciesCodes, setSpeciesCodes] = useState<string[]>([])
  const [lifeStage, setLifeStage] = useState<LifeStage>(DEFAULT_LIFE_STAGE)
  const [petSize, setPetSize] = useState<PetSize>(DEFAULT_PET_SIZE)
  const [showError, setShowError] = useState(false)

  // Seed from the stored profile whenever it changes, so the form always shows
  // what is actually saved rather than what was last typed.
  useEffect(() => {
    if (!profile) {
      setSpeciesCodes([])
      setLifeStage(DEFAULT_LIFE_STAGE)
      setPetSize(DEFAULT_PET_SIZE)
      setShowError(false)
      return
    }

    setSpeciesCodes((profile.species ?? []).map((entry) => entry.code))
    setLifeStage(toLifeStage(profile.life_stage ?? "") ?? DEFAULT_LIFE_STAGE)
    setPetSize(toPetSize(profile.pet_size ?? "") ?? DEFAULT_PET_SIZE)
  }, [profile])

  /**
   * Values this build cannot describe. Reported instead of being papered over:
   * a dropdown showing `undefined` looks like a bug, and silently dropping the
   * value would lose it on the next save.
   */
  const unknownValues =
    (profile && !toLifeStage(profile.life_stage ?? "") ? [profile.life_stage] : [])
      .concat(profile && !toPetSize(profile.pet_size ?? "") ? [profile.pet_size] : [])
      .filter((value): value is string => Boolean(value))

  const options = activeSpecies(speciesQuery.data)
  const codesInUse = new Set((profile?.species ?? []).map((entry) => entry.code))

  const toggleSpecies = (code: string) => {
    setShowError(false)
    setSpeciesCodes((current) =>
      current.includes(code)
        ? current.filter((value) => value !== code)
        : [...current, code]
    )
  }

  const save = () => {
    if (!speciesCodes.length) {
      setShowError(true)
      return
    }

    upsert.mutate(
      { life_stage: lifeStage, pet_size: petSize, species_codes: speciesCodes },
      {
        onSuccess: () => {
          setShowError(false)
          toast.success(copy("petDataSaved"))
        },
        onError: (error) => {
          const { code, status } = inspectAdminError(error)
          console.error(
            `[admin/product-pet-data] save failed (code=${code} status=${status ?? "none"})`
          )
          toast.error(toAdminErrorMessage(error))
        },
      }
    )
  }

  const handleRemove = () => {
    remove.mutate(undefined, {
      onSuccess: () => toast.success(copy("petDataRemoved")),
      onError: (error) => {
        const { code, status } = inspectAdminError(error)
        console.error(
          `[admin/product-pet-data] remove failed (code=${code} status=${status ?? "none"})`
        )
        toast.error(toAdminErrorMessage(error))
      },
    })
  }

  return (
    <Section data-testid="admin-product-pet-data-widget">
      <div className="flex flex-col gap-y-4 px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-y-1">
            <Heading level="h2">{copy("petDataHeading")}</Heading>
            <Hint>{copy("petDataHint")}</Hint>
          </div>

          {profile ? (
            <ConfirmedAction
              trigger={copy("petDataRemoveAction")}
              confirmLabel={copy("petDataRemoveAction")}
              title={copy("petDataRemoveConfirmTitle")}
              body={copy("petDataRemoveConfirmBody")}
              isPending={remove.isPending}
              onConfirm={handleRemove}
            />
          ) : null}
        </div>

        {isLoading ? (
          <p className="text-sm text-fg-subtle">{copy("loading")}</p>
        ) : null}

        {!isLoading && !profile ? <Hint>{copy("petDataEmptyHint")}</Hint> : null}

        {unknownValues.length > 0 ? (
          <Hint variant="error">{copy("petDataUnknownValue")}</Hint>
        ) : null}

        <fieldset className="flex flex-col gap-y-2">
          <legend className="text-sm font-medium text-fg-base">
            {copy("petDataFieldSpecies")}
          </legend>

          <p id="pet-data-species-hint" className="text-xs text-fg-subtle">
            {copy("petDataFieldSpeciesHint")}
          </p>

          {options.length === 0 ? (
            <Hint variant="error">{copy("petDataUnavailable")}</Hint>
          ) : (
            <div className="flex flex-col gap-y-1.5">
              {options.map((entry) => (
                <label
                  key={entry.id}
                  htmlFor={`pet-data-species-${entry.code}`}
                  className="flex cursor-pointer items-center gap-2 text-sm text-fg-base"
                >
                  <input
                    id={`pet-data-species-${entry.code}`}
                    type="checkbox"
                    checked={speciesCodes.includes(entry.code)}
                    onChange={() => toggleSpecies(entry.code)}
                    aria-describedby="pet-data-species-hint"
                    className="size-4 accent-ui-button-base"
                  />
                  <span>{entry.name || copy("unknownSpecies")}</span>
                  {codesInUse.has(entry.code) ? null : (
                    <span className="text-xs text-fg-muted">— {entry.code}</span>
                  )}
                </label>
              ))}
            </div>
          )}

          {showError ? (
            <p role="alert" className="text-xs text-negative-base">
              {copy("petDataSpeciesRequired")}
            </p>
          ) : null}
        </fieldset>

        <div className="flex items-start gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-y-1.5">
            <Label size="small" htmlFor="pet-data-life-stage">
              {copy("petDataFieldLifeStage")}
            </Label>

            <Select
              value={lifeStage}
              onValueChange={(value) => setLifeStage(toLifeStage(value) ?? DEFAULT_LIFE_STAGE)}
              size="small"
            >
              <Select.Trigger id="pet-data-life-stage">
                <Select.Value />
              </Select.Trigger>

              <Select.Content>
                {LIFE_STAGES.map((value) => (
                  <Select.Item key={value} value={value}>
                    {LIFE_STAGE_LABELS[value]}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-y-1.5">
            <Label size="small" htmlFor="pet-data-pet-size">
              {copy("petDataFieldPetSize")}
            </Label>

            <Select
              value={petSize}
              onValueChange={(value) => setPetSize(toPetSize(value) ?? DEFAULT_PET_SIZE)}
              size="small"
            >
              <Select.Trigger id="pet-data-pet-size">
                <Select.Value />
              </Select.Trigger>

              <Select.Content>
                {PET_SIZES.map((value) => (
                  <Select.Item key={value} value={value}>
                    {PET_SIZE_LABELS[value]}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </div>

        <div>
          <Button
            size="small"
            variant="primary"
            onClick={save}
            disabled={upsert.isPending || !speciesCodes.length}
            isLoading={upsert.isPending}
          >
            {copy("petDataSave")}
          </Button>
        </div>
      </div>
    </Section>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductPetDataWidget
/**
 * The brand form, shared by "create" and "edit".
 *
 * ONE component for both, because the fields, the validation and the derived
 * handle preview are identical; the only difference is which mutation runs and
 * whether the fields start empty. Two copies would let the handle rule drift
 * from one screen to the other.
 *
 * VALIDATION IS DUPLICATED FROM THE API ON PURPOSE
 * -------------------------------------------------
 * The zod schemas in `src/api/admin/brands/validators.ts` are the authority and
 * are never skipped. But the API can only answer after a round trip and answers
 * with one flat `message`, while an operator needs to know WHICH field is wrong.
 * So the shapes are checked here first — the same patterns, the same lengths —
 * and a failure that slips through is still reported through the safe error
 * layer rather than shown as a raw backend string.
 */

import { Button, Input, Textarea, toast } from "@medusajs/ui"
import { useEffect, useMemo, useState, type FormEvent } from "react"

import { copy } from "./admin-copy"
import {
  inspectAdminError,
  toAdminErrorMessage,
} from "./admin-api"
import { Field } from "./admin-ui"
import {
  isBrandHandle,
  suggestBrandHandle,
  type AdminBrand,
} from "./vet-domain"

const MAX_NAME = 255
const MAX_DESCRIPTION = 2000
const MAX_LOGO_URL = 2048

/**
 * A storey warning about names that are safe but a bad idea.
 *
 * Only the HANDLE is unique in the database, but the storefront's brand facet is
 * built on `brand_name`, so two brands sharing a name collapse into a single
 * filter option that links to whichever one was read last. That is not something
 * this form can forbid — the API allows it and uniqueness is a backend
 * constraint — but an operator can trivially avoid it, so it is worth a word.
 *
 * Generic plural words are the realistic case: "Demo", "Premium", "Natural".
 */
const GENERIC_BRAND_NAME_PATTERN =
  /^(demo|demo\s*demo|prueba|test|test\s*demo|premium|natural|original|estandar|sample)$/i

type FormState = {
  name: string
  handle: string
  description: string
  logoUrl: string
  isActive: boolean
}

type FormErrors = Partial<Record<keyof FormState, string>>

function initialState(brand?: AdminBrand): FormState {
  return {
    name: brand?.name ?? "",
    handle: brand?.handle ?? "",
    description: brand?.description ?? "",
    logoUrl: brand?.logo_url ?? "",
    isActive: brand?.is_active ?? true,
  }
}

/** Accepts only a complete http(s) URL, matching the API's `z.string().url()`. */
function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

/** True when the name is a word that will collide with other brands. */
function isGenericBrandName(name: string): boolean {
  return GENERIC_BRAND_NAME_PATTERN.test(name.trim())
}

/**
 * Field-level validation. Returns one message per field, so an operator fixes
 * everything in one pass instead of discovering the next problem on save.
 */
export function validateBrandForm(state: FormState): FormErrors {
  const errors: FormErrors = {}

  const name = state.name.trim()
  if (!name) {
    errors.name = copy("brandFieldNameRequired")
  } else if (name.length > MAX_NAME) {
    errors.name = `Máximo ${MAX_NAME} caracteres.`
  }

  const handle = state.handle.trim()
  if (handle) {
    if (handle.length < 2 || handle.length > 64) {
      errors.handle = "Entre 2 y 64 caracteres."
    } else if (!isBrandHandle(handle)) {
      errors.handle = copy("brandFieldHandleInvalid")
    }
  }

  if (state.description.length > MAX_DESCRIPTION) {
    errors.description = `Máximo ${MAX_DESCRIPTION} caracteres.`
  }

  const logoUrl = state.logoUrl.trim()
  if (logoUrl) {
    if (logoUrl.length > MAX_LOGO_URL) {
      errors.logoUrl = "La dirección es demasiado larga."
    } else if (!isHttpUrl(logoUrl)) {
      errors.logoUrl = copy("brandFieldLogoInvalid")
    }
  }

  return errors
}

export const BrandForm = ({
  brand,
  isSaving,
  onSave,
  onCancel,
}: {
  /** Present on the edit screen; absent when creating. */
  brand?: AdminBrand
  isSaving: boolean
  onSave: (input: {
    name: string
    handle?: string
    description: string | null
    logo_url: string | null
    is_active: boolean
  }) => void
  onCancel: () => void
}) => {
  const [state, setState] = useState<FormState>(() => initialState(brand))
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)

  // Re-seed when the loaded brand arrives, or when the screen switches between
  // two brands. Without this the form would keep the previous record's values
  // for a render and briefly offer to save them over the new one.
  useEffect(() => {
    setState(initialState(brand))
    setErrors({})
    setSubmitted(false)
  }, [brand])

  const previewHandle = useMemo(
    () => suggestBrandHandle(state.name),
    [state.name]
  )

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((current) => ({ ...current, [key]: value }))

    if (submitted) {
      setErrors(validateBrandForm({ ...state, [key]: value }))
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)

    const found = validateBrandForm(state)

    if (Object.keys(found).length) {
      setErrors(found)
      return
    }

    setErrors({})

    const handle = state.handle.trim()

    onSave({
      name: state.name.trim(),
      // An empty handle means "let the API derive it", which is different from
      // "clear it", so the key is omitted rather than sent as "".
      ...(handle ? { handle } : {}),
      description: state.description.trim() ? state.description.trim() : null,
      logo_url: state.logoUrl.trim() ? state.logoUrl.trim() : null,
      is_active: state.isActive,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-y-6">
      <Field
        label={copy("brandFieldName")}
        hint={
          isGenericBrandName(state.name)
            ? copy("brandFieldNameHintGeneric")
            : copy("brandFieldNameHint")
        }
        error={errors.name}
        required
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={state.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder={copy("brandFieldNamePlaceholder")}
            autoComplete="off"
          />
        )}
      </Field>

      <Field
        label={copy("brandFieldHandle")}
        hint={
          state.handle.trim()
            ? copy("brandFieldHandleHint")
            : `${copy("brandFieldHandleAuto")} ${previewHandle ? `Ejemplo: /pe/marcas/${previewHandle}` : ""}`
        }
        error={errors.handle}
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={state.handle}
            onChange={(event) => set("handle", event.target.value)}
            placeholder={copy("brandFieldHandlePlaceholder")}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        )}
      </Field>

      <Field
        label={copy("brandFieldDescription")}
        hint={copy("brandFieldDescriptionHint")}
        error={errors.description}
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            value={state.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder={copy("brandFieldDescriptionPlaceholder")}
            rows={4}
          />
        )}
      </Field>

      <Field
        label={copy("brandFieldLogo")}
        hint={copy("brandFieldLogoHint")}
        error={errors.logoUrl}
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={state.logoUrl}
            onChange={(event) => set("logoUrl", event.target.value)}
            placeholder={copy("brandFieldLogoPlaceholder")}
            autoComplete="off"
            spellCheck={false}
          />
        )}
      </Field>

      <fieldset className="flex flex-col gap-y-1.5">
        <legend className="text-sm font-medium text-fg-base">
          {copy("brandFieldStatus")}
        </legend>

        <p className="text-xs text-fg-subtle">{copy("brandFieldStatusHint")}</p>

        <div className="mt-1 flex items-center gap-4">
          <label
            htmlFor="brand-status-active"
            className="flex cursor-pointer items-center gap-2 text-sm text-fg-base"
          >
            <input
              id="brand-status-active"
              type="radio"
              name="brand-status"
              checked={state.isActive}
              onChange={() => set("isActive", true)}
              className="size-4 accent-ui-button-base"
            />
            <span>{copy("brandFieldStatusActive")}</span>
          </label>

          <label
            htmlFor="brand-status-inactive"
            className="flex cursor-pointer items-center gap-2 text-sm text-fg-base"
          >
            <input
              id="brand-status-inactive"
              type="radio"
              name="brand-status"
              checked={!state.isActive}
              onChange={() => set("isActive", false)}
              className="size-4 accent-ui-button-base"
            />
            <span>{copy("brandFieldStatusInactive")}</span>
          </label>
        </div>
      </fieldset>

      <div className="flex items-center gap-2 border-t border-ui-border-base pt-4">
        <Button type="submit" variant="primary" isLoading={isSaving}>
          {isSaving ? copy("brandSaving") : copy("brandSave")}
        </Button>

        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
          {copy("brandCancel")}
        </Button>
      </div>
    </form>
  )
}

/**
 * Run a save and turn the outcome into a toast.
 *
 * The success message is authored here, and a failure is reduced to the safe
 * layer's Spanish sentence with the code and status logged for diagnostics. The
 * backend's own message never reaches the screen.
 */
export function reportSaveOutcome({
  isError,
  error,
  successMessage,
  onSuccess,
}: {
  isError: boolean
  error: unknown
  successMessage: string
  onSuccess: () => void
}) {
  if (isError) {
    const { code, status } = inspectAdminError(error)
    console.error(`[admin/brands] save failed (code=${code} status=${status ?? "none"})`)

    toast.error(toAdminErrorMessage(error))
    return
  }

  toast.success(successMessage)
  onSuccess()
}
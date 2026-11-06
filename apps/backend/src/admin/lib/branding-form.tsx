import { Button, Hint, clx } from "@medusajs/ui"
import { useEffect, useState } from "react"

import { copy, HERO_SLIDE_LABELS } from "./admin-copy"
import { Field, Section } from "./admin-ui"
import { toAdminErrorMessage } from "./admin-api"
import {
  useBranding,
  useStoreCategories,
  useUpdateBranding,
  useUploadBrandingArtwork,
} from "./admin-queries"
import {
  HERO_SLIDE_IDS,
  type AdminBrandingColors,
  type ArtworkTarget,
} from "./admin-api"

/**
 * The five editable colours, in the order an operator thinks about them.
 *
 * `key` is the field name on the API payload AND the CSS custom property it
 * feeds, so the mapping stays obvious and there is one source of truth for
 * which colour does what.
 */
const COLOR_FIELDS: ReadonlyArray<{
  key: keyof AdminBrandingColors
  label: string
  hint: string
  /** The token `globals.css` defines, shown so the operator can trace it. */
  token: string
}> = [
  {
    key: "primary",
    label: copy("brandFieldPrimary"),
    hint: copy("brandFieldPrimaryHint"),
    token: "--brand-500",
  },
  {
    key: "primaryDark",
    label: copy("brandFieldPrimaryDark"),
    hint: copy("brandFieldPrimaryDarkHint"),
    token: "--brand-700",
  },
  {
    key: "accent",
    label: copy("brandFieldAccent"),
    hint: copy("brandFieldAccentHint"),
    token: "--accent-500",
  },
  {
    key: "surface",
    label: copy("brandFieldSurface"),
    hint: copy("brandFieldSurfaceHint"),
    token: "--surface",
  },
  {
    key: "text",
    label: copy("brandFieldText"),
    hint: copy("brandFieldTextHint"),
    token: "--fg-base",
  },
]

const HEX = /^#[0-9a-fA-F]{6}$/

/** One row in an artwork grid. */
type ArtworkSlot = {
  /** React key. Stable and unique within a grid. */
  id: string
  /** The map key this slot writes to: a category handle or a hero slide id. */
  key: string
  /** What the operator reads to know which image this is. */
  label: string
}

/**
 * The hero controls, in slide order.
 *
 * Built from `HERO_SLIDE_IDS` rather than hand-listed, so the screen cannot offer
 * a control the backend would refuse: the ids come from the same list the upload
 * endpoint validates against.
 *
 * NO MOBILE / DESKTOP SPLIT
 * -------------------------
 * A slide config carries `imageDesktop` and `imageMobile`, so a second control
 * per slide would look defensible. It would be ceremony: the hero renders inside
 * a fixed `4/3` to `3/2` box with `object-cover`, so one image already serves
 * both viewports by cropping. A second control would invite an operator to
 * maintain two assets for a difference nobody can see.
 */
const HERO_SLOTS: ArtworkSlot[] = HERO_SLIDE_IDS.map((id) => ({
  id,
  key: id,
  label: HERO_SLIDE_LABELS[id],
}))

/**
 * The artwork grid, one control per slot.
 *
 * Used for BOTH category circles and hero slides. They are the same operation —
 * pick a file, see a preview, clear it — over a different key space, and the two
 * only differ in the shape of the preview frame. Generalising this component is
 * what keeps one upload path for both: two grids would mean two places for the
 * input-reset key and the error handling to drift apart.
 *
 * Split out of `BrandingForm` because it is a LIST: it maps over the slots it is
 * given, and keeping that map inline would bury the rest of the screen under
 * per-item markup. All of its state is lifted, so the parent still owns one draft
 * for the whole screen and one Save button still saves everything.
 *
 * WHY THE PREVIEW IS A PLAIN `<img>`
 * The uploaded URL points at whatever host the deployment runs on, and the admin
 * bundle has no image optimiser to route it through. A plain `<img>` is the
 * honest element here: it renders what the backend actually stored, instead of
 * depending on a proxy that would have to be configured first.
 */
function ArtworkGrid({
  artwork,
  slots,
  shape,
  uploading,
  errors,
  onUpload,
  onClear,
}: {
  artwork: Record<string, string>
  slots: ArtworkSlot[]
  /** Mirrors how the storefront crops each kind of artwork. */
  shape: "circle" | "banner"
  uploading: string[]
  errors: Record<string, string>
  onUpload: (key: string, file: File) => void
  onClear: (key: string) => void
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-5 medium:grid-cols-3">
      {slots.map((slot) => {
        const uploaded = artwork[slot.key]
        const isUploading = uploading.includes(slot.key)

        return (
          <li
            key={slot.id}
            className="flex flex-col gap-y-2"
            data-testid={`artwork-${slot.key}`}
          >
            <div className="flex items-center gap-3">
              {/* Cropped exactly as the storefront crops it, so the operator
                  approves the framing they will actually get rather than a
                  squashed or circular version of it. */}
              <span
                className={clx(
                  "relative block shrink-0 overflow-hidden bg-ui-bg-subtle ring-1 ring-ui-border-base",
                  shape === "circle" ? "aspect-square w-16 rounded-full" : "aspect-[4/3] w-24 rounded-md"
                )}
              >
                {uploaded ? (
                  <img
                    src={uploaded}
                    alt={slot.label}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] leading-tight text-ui-fg-subtle">
                    {copy("brandingArtworkDemoLabel")}
                  </span>
                )}
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ui-fg-base">
                  {slot.label}
                </p>
                <p className="truncate text-xs text-ui-fg-subtle">
                  {uploaded ? uploaded : copy("brandingArtworkDemoLabel")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* The key carries the stored URL, so a successful upload remounts the input
                  and empties it. Without that reset, picking the SAME file twice
                  in a row would not fire `change` the second time and the second
                  upload would silently do nothing. */}
              <input
                key={`${slot.key}-${uploaded ?? "none"}`}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                aria-label={copy("brandingArtworkUpload")}
                className="max-w-[160px] text-xs"
                onChange={(event) => {
                  const file = event.target.files?.[0]

                  if (file) {
                    onUpload(slot.key, file)
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              {uploaded ? (
                <Button
                  size="small"
                  variant="transparent"
                  onClick={() => onClear(slot.key)}
                >
                  {copy("brandingArtworkClear")}
                </Button>
              ) : null}
              {isUploading ? (
                <span className="text-xs text-ui-fg-subtle">
                  {copy("brandingArtworkUploading")}
                </span>
              ) : null}
              {errors[slot.key] ? (
                <p role="alert" className="text-xs text-ui-fg-danger">
                  {errors[slot.key]}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Public URL of the storefront, exposed to this screen only.
 *
 * Read from the DOM because the admin bundle has no access to the backend's
 * environment. When it is missing the preview is replaced by an explanation
 * rather than an empty frame, so the operator knows the storefront is not
 * running instead of wondering why the box is blank.
 */
const storefrontUrl = (): string | null => {
  const configured = document
    .querySelector<HTMLMetaElement>('meta[name="fancy-storefront-url"]')
    ?.content?.trim()

  return configured || null
}

/**
 * A copy of the map without one key.
 *
 * Returning a new object rather than mutating is what makes React see a change;
 * the artwork map is small enough that the copy costs nothing measurable and
 * mutating shared state here would leak into the cached query value.
 */
const omitKey = <T,>(
  source: Record<string, T>,
  key: string
): Record<string, T> => {
  const { [key]: _removed, ...rest } = source

  return rest
}

/**
 * Brand settings form.
 *
 * A local draft is kept while the operator types and only sent on save, so a
 * half-typed hex never reaches the storefront and a stray click cannot restyle
 * the shop. The draft is seeded from the query once and then owned by the user:
 * re-seeding on every background refetch would discard in-progress edits.
 */
export function BrandingForm() {
  const { data: branding, isLoading } = useBranding()
  const { data: categories, isError: categoriesFailed } = useStoreCategories()
  const save = useUpdateBranding()
  const upload = useUploadBrandingArtwork()

  const [logoUrl, setLogoUrl] = useState("")
  const [tagline, setTagline] = useState("")
  const [colors, setColors] = useState<AdminBrandingColors | null>(null)
  const [announcementEnabled, setAnnouncementEnabled] = useState(true)
  const [announcement, setAnnouncement] = useState<string[]>([])
  const [categoryArtwork, setCategoryArtwork] = useState<Record<string, string>>({})
  const [heroArtwork, setHeroArtwork] = useState<Record<string, string>>({})
  /**
   * Pending and failed uploads are tracked PER TARGET, not globally: a hero
   * upload must not make a category control look busy, and a category error must
   * not appear under a banner.
   */
  const [pending, setPending] = useState<Record<string, string[]>>({
    category: [],
    hero: [],
  })
  const [artworkErrors, setArtworkErrors] = useState<
    Record<ArtworkTarget, Record<string, string>>
  >({ category: {}, hero: {} })
  /**
   * The last artwork outcome, scoped to the section that produced it.
   *
   * Scoped rather than a single screen-level string because both sections share
   * this component's sibling: one message at the bottom of the page would report
   * a category failure under the hero banner, which is the opposite of helpful.
   */
  const [artworkNote, setArtworkNote] = useState<{
    target: ArtworkTarget
    text: string
  } | null>(null)
  const [seeded, setSeeded] = useState(false)
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)

  /**
   * Write one of the two maps, chosen by target.
   *
   * Takes a React updater so callers read as "change this map" rather than
   * repeating the target branch at every call site, which is where a
   * category-only implementation would quietly grow a second copy.
   */
  const setArtworkFor = (
    target: ArtworkTarget,
    update: (current: Record<string, string>) => Record<string, string>
  ) => (target === "hero" ? setHeroArtwork(update) : setCategoryArtwork(update))

  useEffect(() => {
    if (!branding || seeded) {
      return
    }
    setLogoUrl(branding.logo_url ?? "")
    setTagline(branding.tagline ?? "")
    setColors(branding.colors)
    setAnnouncementEnabled(branding.announcement_enabled)
    setAnnouncement(branding.announcement_messages)
    setCategoryArtwork(branding.category_artwork ?? {})
    setHeroArtwork(branding.hero_artwork ?? {})
    setSeeded(true)
  }, [branding, seeded])

  if (isLoading || !colors) {
    return null
  }

  const invalidColor = Object.values(colors).find((value) => !HEX.test(value))
  const shopUrl = storefrontUrl()

  /**
   * Upload runs IMMEDIATELY, unlike every other control on this screen.
   *
   * The endpoint is a workflow that persists on its own, so waiting for Save
   * would mean holding megabytes in a draft and then uploading them anyway. The
   * draft is updated with the stored URL straight away so the preview shows what
   * the backend has, and a later Save simply re-persists the same map.
   *
   * Its outcome is reported in the section's own note rather than the screen's
   * save banner: uploading is not "saving the form", and borrowing that message
   * would tell the operator their colour edits went out when they did not.
   */
  const handleArtworkUpload = (
    target: ArtworkTarget,
    artworkKey: string,
    file: File
  ) => {
    setPending((current) => ({
      ...current,
      [target]: [...current[target], artworkKey],
    }))
    setArtworkErrors((current) => ({
      ...current,
      [target]: omitKey(current[target], artworkKey),
    }))
    setArtworkNote(null)

    upload.mutate(
      { target, key: artworkKey, file },
      {
        onSuccess: ({ artwork: stored }) => {
          setArtworkFor(stored.target, (current) => ({
            ...current,
            [stored.key]: stored.url,
          }))
          setArtworkNote({
            target: stored.target,
            text: copy("brandingArtworkUploaded"),
          })
        },
        onError: (cause) => {
          setArtworkErrors((current) => ({
            ...current,
            [target]: {
              ...current[target],
              [artworkKey]: toAdminErrorMessage(cause),
            },
          }))
        },
        onSettled: () => {
          setPending((current) => ({
            ...current,
            [target]: current[target].filter((entry) => entry !== artworkKey),
          }))
        },
      }
    )
  }

  /**
   * Clearing is local-only on purpose.
   *
   * The upload endpoint only ADDS, so there is no single-artwork delete route to
   * call. Dropping the entry here and letting Save write the smaller map is the
   * same shape as editing any other field, and the storefront falls back to the
   * configured artwork the moment the entry is gone.
   */
  const handleArtworkClear = (target: ArtworkTarget, artworkKey: string) => {
    setArtworkFor(target, (current) => omitKey(current, artworkKey))
    setArtworkErrors((current) => ({
      ...current,
      [target]: omitKey(current[target], artworkKey),
    }))
    setArtworkNote({ target, text: copy("brandingArtworkCleared") })
  }

  const handleSave = () => {
    if (invalidColor) {
      setStatus("error")
      setError(copy("brandingInvalidColor"))
      return
    }

    setStatus("idle")
    setError(null)

    save.mutate(
      {
        logo_url: logoUrl.trim() ? logoUrl.trim() : null,
        tagline: tagline.trim() ? tagline.trim() : null,
        announcement_enabled: announcementEnabled,
        announcement_messages: announcement
          .map((entry) => entry.trim())
          .filter(Boolean),
        category_artwork: categoryArtwork,
        hero_artwork: heroArtwork,
        colors,
      },
      {
        onSuccess: () => {
          setStatus("saved")
          setArtworkNote(null)
          // Bump the key so the iframe remounts and re-fetches the storefront.
          // The storefront caches branding for 60s, so the frame also gets a
          // cache-busting query rather than showing the previous paint.
          setPreviewKey((current) => current + 1)
        },
        onError: (cause) => {
          setStatus("error")
          setError(toAdminErrorMessage(cause))
        },
      }
    )
  }

  return (
    <div className="flex flex-col gap-y-8" data-testid="branding-form">
      <Section>
        <div className="flex flex-col gap-y-3 px-6 py-6">
          <h2 className="text-base font-semibold">{copy("brandingColorsHeading")}</h2>

          <div className="grid gap-x-6 gap-y-5 medium:grid-cols-2">
            {COLOR_FIELDS.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                hint={field.hint}
              >
                {({ id, ...aria }) => (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label={field.label}
                      className="h-9 w-12 shrink-0 cursor-pointer rounded border border-ui-border-base bg-transparent p-0.5"
                      value={
                        HEX.test(colors[field.key]) ? colors[field.key] : "#000000"
                      }
                      onChange={(event) =>
                        setColors((current) =>
                          current
                            ? { ...current, [field.key]: event.target.value }
                            : current
                        )
                      }
                    />
                    <input
                      id={id}
                      {...aria}
                      value={colors[field.key]}
                      onChange={(event) =>
                        setColors((current) =>
                          current
                            ? { ...current, [field.key]: event.target.value }
                            : current
                        )
                      }
                      spellCheck={false}
                      autoComplete="off"
                      placeholder="#F99C32"
                    />
                    <span className="shrink-0 text-xs text-ui-fg-subtle">
                      {field.token}
                    </span>
                  </div>
                )}
              </Field>
            ))}
          </div>
        </div>
      </Section>

      <Section>
        <div className="flex flex-col gap-y-5 px-6 py-6">
          <h2 className="text-base font-semibold">{copy("brandingLogoHeading")}</h2>

          <Field
            label={copy("brandingLogoHeading")}
            hint={copy("brandingLogoHint")}
          >
            {({ id, ...aria }) => (
              <input
                id={id}
                {...aria}
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                placeholder={copy("brandingLogoPlaceholder")}
                spellCheck={false}
                autoComplete="off"
              />
            )}
          </Field>

          <Field
            label={copy("brandingTaglineHeading")}
            hint={copy("brandingTaglineHint")}
          >
            {({ id, ...aria }) => (
              <input
                id={id}
                {...aria}
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                maxLength={160}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section>
        <div className="flex flex-col gap-y-4 px-6 py-6">
          <h2 className="text-base font-semibold">
            {copy("brandingAnnouncementHeading")}
          </h2>
          <Hint>{copy("brandingAnnouncementHint")}</Hint>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={announcementEnabled}
              onChange={(event) => setAnnouncementEnabled(event.target.checked)}
            />
            {copy("brandingAnnouncementEnabled")}
          </label>

          {announcementEnabled
            ? announcement.map((message, index) => (
                <div
                  key={`${index}-announcement`}
                  className="flex items-center gap-2"
                >
                  <input
                    value={message}
                    maxLength={120}
                    placeholder={copy("brandingAnnouncementMessageLabel")}
                    onChange={(event) =>
                      setAnnouncement((current) =>
                        current.map((entry, i) =>
                          i === index ? event.target.value : entry
                        )
                      )
                    }
                  />
                  <Button
                    size="small"
                    variant="transparent"
                    onClick={() =>
                      setAnnouncement((current) =>
                        current.filter((_, i) => i !== index)
                      )
                    }
                  >
                    {copy("brandingAnnouncementRemove")}
                  </Button>
                </div>
              ))
            : null}

          {announcementEnabled && announcement.length < 5 ? (
            <div>
              <Button
                size="small"
                variant="secondary"
                onClick={() => setAnnouncement((current) => [...current, ""])}
              >
                {copy("brandingAnnouncementAdd")}
              </Button>
            </div>
          ) : null}
        </div>
      </Section>

      <Section>
        <div className="flex flex-col gap-y-3 px-6 py-6">
          <h2 className="text-base font-semibold">
            {copy("brandingHeroHeading")}
          </h2>
          <Hint>{copy("brandingHeroHint")}</Hint>

          <ArtworkGrid
            artwork={heroArtwork}
            slots={HERO_SLOTS}
            shape="banner"
            uploading={pending.hero}
            errors={artworkErrors.hero}
            onUpload={(artworkKey, file) =>
              handleArtworkUpload("hero", artworkKey, file)
            }
            onClear={(artworkKey) => handleArtworkClear("hero", artworkKey)}
          />

          {artworkNote?.target === "hero" ? (
            <p role="status" className="text-sm text-ui-fg-success">
              {artworkNote.text}
            </p>
          ) : null}
        </div>
      </Section>

      <Section>
        <div className="flex flex-col gap-y-3 px-6 py-6">
          <h2 className="text-base font-semibold">
            {copy("brandingArtworkHeading")}
          </h2>
          <Hint>{copy("brandingArtworkHint")}</Hint>

          {categoriesFailed ? (
            <p className="text-sm text-ui-fg-subtle">
              {copy("brandingArtworkEmpty")}
            </p>
          ) : categories?.length ? (
            <ArtworkGrid
              artwork={categoryArtwork}
              slots={categories.map((category) => ({
                id: category.id,
                key: category.handle,
                label: category.name,
              }))}
              shape="circle"
              uploading={pending.category}
              errors={artworkErrors.category}
              onUpload={(artworkKey, file) =>
                handleArtworkUpload("category", artworkKey, file)
              }
              onClear={(artworkKey) =>
                handleArtworkClear("category", artworkKey)
              }
            />
          ) : null}

          {artworkNote?.target === "category" ? (
            <p role="status" className="text-sm text-ui-fg-success">
              {artworkNote.text}
            </p>
          ) : null}
        </div>
      </Section>

      <Section>
        <div className="flex flex-col gap-y-3 px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-y-0.5">
              <h2 className="text-base font-semibold">
                {copy("brandingPreviewHeading")}
              </h2>
              <p className="text-sm text-ui-fg-subtle">
                {copy("brandingPreviewBody")}
              </p>
            </div>
            {shopUrl ? (
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setPreviewKey((current) => current + 1)}
                >
                  {copy("brandingPreviewReload")}
                </Button>
                <a
                  href={shopUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-small-medium underline"
                >
                  {copy("brandingPreviewOpen")}
                </a>
              </div>
            ) : null}
          </div>

          {/* The REAL storefront, not a mock of it.

              An iframe rather than a styled div because the operator's question
              is "what will a customer see", and only the real page answers that.
              A preview built from the form's own state could show a green button
              on a page that is actually broken by a missing collection, which is
              precisely the failure a preview must not hide.

              `key` remounts the frame after a save so the storefront re-reads
              branding rather than serving its cached copy. */}
          {shopUrl ? (
            <iframe
              key={previewKey}
              title={copy("brandingPreviewHeading")}
              src={`${shopUrl}${shopUrl.endsWith("/pe") ? "" : "/pe"}${
                previewKey ? `?v=${previewKey}` : ""
              }`}
              className="h-[560px] w-full rounded-lg border border-ui-border-base"
              sandbox="allow-same-origin allow-scripts allow-popups"
            />
          ) : (
            <p className="text-sm text-ui-fg-muted">
              {copy("brandingPreviewUnavailable")}
            </p>
          )}
        </div>
      </Section>

      {status === "saved" ? (
        <p role="status" className="text-sm text-ui-fg-success">
          {copy("brandingSaved")}
        </p>
      ) : null}
      {status === "error" && error ? (
        <p role="alert" className="text-sm text-ui-fg-danger">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2 px-6 pb-6">
        <Button
          size="small"
          variant="primary"
          onClick={handleSave}
          disabled={save.isPending}
          isLoading={save.isPending}
        >
          {save.isPending ? copy("brandingSaving") : copy("brandingSave")}
        </Button>
      </div>
    </div>
  )
}
import { clx } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Reusable "nothing here yet" block.
 *
 * Used wherever the backend legitimately returns nothing: an empty category
 * (the `farmacia` category is intentionally empty), an empty collection, a
 * search with no matches and a failed fetch. It is a Server Component, so it can
 * be rendered from any template without adding a client boundary.
 *
 * Copy is always passed in already resolved through `t()` by the caller, so
 * this component never owns a string and can never surface a raw error object.
 */
export type EmptyStateProps = {
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
  className?: string
  "data-testid"?: string
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  className,
  "data-testid": dataTestid,
}: EmptyStateProps) {
  return (
    <div
      className={clx(
        "flex flex-col items-center gap-3 rounded-large border border-dashed border-[var(--border-strong)] bg-surface-subtle px-6 py-12 text-center",
        className
      )}
      data-testid={dataTestid}
    >
      <h2 className="text-lg font-semibold text-fg-base">{title}</h2>

      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-fg-subtle">
          {description}
        </p>
      ) : null}

      {actionLabel && actionHref ? (
        <LocalizedClientLink
          href={actionHref}
          className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-brand-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
        >
          {actionLabel}
        </LocalizedClientLink>
      ) : null}
    </div>
  )
}

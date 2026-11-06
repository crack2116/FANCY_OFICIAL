/**
 * Small presentational pieces shared by the brand routes and the product widgets.
 *
 * They exist so the same label, the same focus ring and the same error styling
 * appear in both places. A confirmation dialog written twice drifts: one copy
 * stops saying that deactivation is reversible, and an operator reads it as a
 * delete.
 *
 * Everything is a real `<label for>`, a real `<fieldset>/<legend>` and a real
 * button, so the whole screen is keyboard-operable and the browser draws the
 * focus ring. Nothing here depends on hover to be usable.
 */

import {
  Button,
  Container,
  Heading,
  Hint,
  Label,
  Prompt,
  StatusBadge,
  clx,
} from "@medusajs/ui"
import { useId, useState, type ReactNode } from "react"

import { copy } from "./admin-copy"

/** A page header with a title, optional description and optional actions. */
export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) => (
  <div className="flex items-start justify-between gap-4 px-6 py-4">
    <div className="flex min-w-0 flex-col gap-y-1">
      <Heading level="h1">{title}</Heading>
      {description ? (
        <Hint className="max-w-2xl text-pretty">{description}</Hint>
      ) : null}
    </div>

    {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
  </div>
)

/**
 * A labelled input with an inline error.
 *
 * The error is wired to the control with `aria-describedby` and the control is
 * marked `aria-invalid`, so a screen reader announces the problem instead of
 * leaving the operator to hunt for red text.
 */
export const Field = ({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string
  hint?: string
  error?: string | null
  required?: boolean
  children: (props: {
    id: string
    "aria-describedby": string | undefined
    "aria-invalid": boolean | undefined
    "aria-required": boolean | undefined
  }) => ReactNode
}) => {
  const baseId = useId()
  const controlId = `${baseId}-control`
  const hintId = `${baseId}-hint`
  const errorId = `${baseId}-error`

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined

  return (
    <div className="flex flex-col gap-y-1.5">
      <Label size="small" htmlFor={controlId}>
        {label}
        {required ? <span className="text-negative-base"> *</span> : null}
      </Label>

      {children({
        id: controlId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "aria-required": required ? true : undefined,
      })}

      {hint ? (
        <Hint id={hintId} className="text-pretty">
          {hint}
        </Hint>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-negative-base">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** `Activa` / `Inactiva`, as a real status badge rather than coloured text. */
export const StatusPill = ({ isActive }: { isActive: boolean }) => (
  <StatusBadge color={isActive ? "green" : "grey"}>
    {isActive ? copy("brandsStatusActive") : copy("brandsStatusInactive")}
  </StatusBadge>
)

/**
 * A reversible-or-not action behind an explicit confirmation.
 *
 * Deactivation is the reversible one, so its body says so. That sentence is the
 * whole reason this component exists rather than a bare `window.confirm`.
 *
 * The dialog is a Radix `AlertDialog`, so it traps focus, restores it on close
 * and marks itself `role="alertdialog"` — the confirmation is reachable without
 * a mouse.
 */
export const ConfirmedAction = ({
  title,
  body,
  note,
  trigger,
  confirmLabel,
  onConfirm,
  isPending,
  isDisabled,
  variant = "secondary",
}: {
  title: string
  body: string
  note?: string
  trigger: string
  confirmLabel: string
  onConfirm: () => void
  isPending: boolean
  isDisabled?: boolean
  variant?: "primary" | "secondary" | "danger"
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        size="small"
        variant={variant}
        onClick={() => setIsOpen(true)}
        disabled={isDisabled || isPending}
        isLoading={isPending}
      >
        {trigger}
      </Button>

      <Prompt
        open={isOpen}
        onOpenChange={setIsOpen}
        variant={variant === "danger" ? "danger" : "confirmation"}
      >
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>{title}</Prompt.Title>
            <Prompt.Description>{body}</Prompt.Description>
          </Prompt.Header>

          {note ? (
            <p className="px-6 pb-2 text-sm text-fg-muted">{note}</p>
          ) : null}

          <Prompt.Footer>
            <Prompt.Cancel disabled={isPending}>{copy("brandCancel")}</Prompt.Cancel>
            <Prompt.Action onClick={onConfirm} disabled={isPending}>
              {confirmLabel}
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </>
  )
}

/**
 * A centered empty state.
 *
 * `illustration` keeps the shape stable between a loading brand list and a
 * genuinely empty one, so the page does not jump when the request resolves.
 */
export const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) => (
  <Container className="flex flex-col items-center gap-y-3 px-6 py-16 text-center">
    <Heading level="h2">{title}</Heading>
    <p className="max-w-md text-sm text-fg-subtle">{description}</p>
    {action}
  </Container>
)

/** Section wrapper, so every admin surface has the same vertical rhythm. */
export const Section = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => (
  <Container className={clx("divide-y p-0", className)}>{children}</Container>
)

/** Route to render when a query failed, with the safe message and a retry. */
export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <Container className="flex flex-col items-center gap-y-3 px-6 py-16 text-center">
    <p role="alert" className="text-sm text-negative-base">
      {message}
    </p>
    <Button size="small" variant="secondary" onClick={onRetry}>
      {copy("retry")}
    </Button>
  </Container>
)
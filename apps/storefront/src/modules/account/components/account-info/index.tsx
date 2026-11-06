/**
 * Disclosure shell for one account section: shows the current value, and reveals
 * the form when the shopper asks to edit it.
 *
 * It holds NO copy of its own beyond the two button labels, both of which come
 * from the translation dictionary.
 *
 * A11y
 * - The panel that opens and closes is a real region, so the button's
 *   `aria-expanded`/`aria-controls` pair describes the state.
 * - Success uses `role="status"` (polite: "it saved") and failure uses
 *   `role="alert"` (assertive: "that did not work"), so the outcome is announced
 *   without moving focus.
 */

import { Badge, Button } from "@modules/common/components/ui"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { t } from "@lib/i18n/translations"
import useToggleState from "@lib/hooks/use-toggle-state"
import { useEffect } from "react"

type AccountInfoProps = {
  label: string
  currentInfo: string | React.ReactNode
  isSuccess?: boolean
  isError?: boolean
  /** Copy for a whole-section failure. Required whenever `isError` can be true. */
  errorMessage?: string | null
  clearState: () => void
  children?: React.ReactNode
  panelId: string
  "data-testid"?: string
}

const AccountInfo = ({
  label,
  currentInfo,
  isSuccess,
  isError,
  errorMessage,
  clearState,
  children,
  panelId,
  "data-testid": dataTestid,
}: AccountInfoProps) => {
  const { state, close, toggle } = useToggleState()

  const handleToggle = () => {
    clearState()
    toggle()
  }

  // A successful save collapses the form: the shopper's next action is to read
  // the new value, not to keep the fields open. `close` is recreated on every
  // render but only ever sets the same value, so re-running is a no-op.
  useEffect(() => {
    if (isSuccess && state) {
      close()
    }
  }, [isSuccess, state, close])

  return (
    <div className="text-small-regular" data-testid={dataTestid}>
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col min-w-0">
          <span className="uppercase text-ui-fg-base">{label}</span>
          <div className="flex items-center flex-1 basis-0 justify-end gap-x-4 min-w-0">
            {typeof currentInfo === "string" ? (
              <span className="font-semibold truncate" data-testid="current-info">
                {currentInfo}
              </span>
            ) : (
              currentInfo
            )}
          </div>
        </div>
        <div>
          <Button
            variant="secondary"
            className="w-[110px] min-h-[25px] py-1"
            onClick={handleToggle}
            type="button"
            aria-expanded={state}
            aria-controls={panelId}
            data-testid="edit-button"
          >
            {state ? t("account.profile.cancel") : t("account.profile.edit")}
          </Button>
        </div>
      </div>

      {isSuccess ? (
        <div role="status" data-testid="success-message">
          <Badge className="p-2 my-4" color="green">
            {t("account.profile.saved")}
          </Badge>
        </div>
      ) : null}

      {isError && errorMessage ? (
        <div role="alert" data-testid="error-message">
          <Badge className="p-2 my-4" color="red">
            {errorMessage}
          </Badge>
        </div>
      ) : null}

      <div id={panelId} hidden={!state}>
        <div className="flex flex-col gap-y-2 py-4">
          <div>{children}</div>
          <div className="flex items-center justify-end mt-2">
            <SubmitButton className="w-full small:max-w-[180px]" data-testid="save-button">
              {t("account.profile.save")}
            </SubmitButton>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountInfo
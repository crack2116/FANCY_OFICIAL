import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import { clx } from "@modules/common/components/ui"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  availableValues?: string[]
  "data-testid"?: string
}

/**
 * One variant option group.
 *
 * A real `fieldset`/`legend` so the group is announced as a group, real buttons
 * with `aria-pressed` so their state is exposed, and the option title comes from
 * the API (it is "Presentación" for the demo catalogue) instead of a hardcoded
 * "Size".
 */
const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
  availableValues,
}) => {
  const available = availableValues ? new Set(availableValues) : null
  const filteredOptions = (option.values ?? [])
    .map((v) => v.value)
    .filter((value) => !available || available.has(value))

  return (
    <fieldset className="flex flex-col gap-y-3" data-testid={dataTestId}>
      <legend className="text-sm font-medium text-fg-base">
        {t("product.selectOptionTitle", { title: title || option.id })}
      </legend>

      <div className="flex flex-wrap gap-2">
        {filteredOptions.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => updateOption(option.id, value)}
            aria-pressed={value === current}
            className={clx(
              "flex h-11 min-w-[4.5rem] flex-1 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors",
              {
                "border-brand-700 bg-brand-700 text-white shadow-sm":
                  value === current,
                "border-[#e6d8c4] bg-white text-fg-subtle hover:border-brand-300 hover:bg-brand-50":
                  value !== current,
              }
            )}
            disabled={disabled}
            data-testid="option-button"
          >
            {value}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export default OptionSelect
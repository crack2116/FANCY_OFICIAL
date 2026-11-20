import { HttpTypes } from "@medusajs/types"
import { t } from "@lib/i18n/translations"
import { formatOptionValueForDisplay } from "@lib/util/product-options"
import { clx } from "@modules/common/components/ui"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  values?: string[]
  current: string | undefined
  updateOption: (optionId: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

/**
 * One variant option group.
 *
 * Renders only valid variant values with context-aware Spanish labels
 * (e.g. "Peso (kg)" for food weights vs "Talla" for apparel sizes) while
 * keeping raw Medusa values intact for variant matching.
 */
const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  values,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const filteredOptions =
    values ?? (option.values ?? []).map((v) => v.value).filter(Boolean)

  if (filteredOptions.length === 0) {
    return null
  }

  return (
    <fieldset className="flex flex-col gap-y-2.5" data-testid={dataTestId}>
      <legend className="text-sm font-semibold text-fg-base">
        {t("product.selectOptionTitle", { title: title || option.id })}
      </legend>

      <div className="flex flex-wrap gap-2">
        {filteredOptions.map((value) => {
          const isSelected = value === current
          const displayLabel = formatOptionValueForDisplay(value, title)

          return (
            <button
              key={value}
              type="button"
              onClick={() => updateOption(option.id, value)}
              aria-pressed={isSelected}
              className={clx(
                "flex h-10 min-w-[4.5rem] flex-1 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-all",
                {
                  "border-brand-700 bg-[#FFF4EC] text-[#0F352E] ring-1 ring-brand-700/25 shadow-xs":
                    isSelected,
                  "border-[var(--border-subtle)] bg-white text-fg-base hover:border-brand-700/50 hover:bg-surface-subtle":
                    !isSelected,
                }
              )}
              disabled={disabled}
              data-testid="option-button"
            >
              {displayLabel}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export default OptionSelect

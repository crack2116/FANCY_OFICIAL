import { IconProps } from "types/icon"

/**
 * Medical cross. The header nav icon for "Farmacia".
 *
 * Deliberately NOT the red cross of the Red Cross emblem, which is a protected
 * symbol in several jurisdictions. This is a plain geometric cross in
 * `currentColor`, so it takes the link colour and makes no colour claim.
 */
const Cross = ({ size = "18", color = "currentColor", ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <path
      d="M8.3 2.8h3.4v5.5h5.5v3.4h-5.5v5.5H8.3v-5.5H2.8V8.3h5.5V2.8Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
)

export default Cross
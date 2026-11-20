import { IconProps } from "types/icon"

/**
 * Diagonal two-half capsule pill. The header nav icon for "Farmacia".
 */
const Cross = ({ size = "19", color = "currentColor", ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <path
      d="m8.5 19.1-3.6-3.6a4.5 4.5 0 0 1 0-6.4l4.2-4.2a4.5 4.5 0 0 1 6.4 0l3.6 3.6a4.5 4.5 0 0 1 0 6.4l-4.2 4.2a4.5 4.5 0 0 1-6.4 0Z"
      stroke={color}
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="m8.8 8.8 6.4 6.4"
      stroke={color}
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </svg>
)

export default Cross

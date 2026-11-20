import { IconProps } from "types/icon"

/**
 * Play ball. The header nav icon for "Juguetes".
 */
const Ball = ({ size = "19", color = "currentColor", ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="8.4" stroke={color} strokeWidth="1.9" />
    <path d="M12 3.6v16.8" stroke={color} strokeWidth="1.8" />
    <path
      d="M5.2 7.6c4.3 2.7 9.3 2.7 13.6 0"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
)

export default Ball

import { IconProps } from "types/icon"

/**
 * Percent badge. The header nav icon for "Ofertas".
 */
const Percent = ({ size = "19", color = "currentColor", ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <circle cx="7.5" cy="7.5" r="2.6" stroke={color} strokeWidth="1.9" />
    <circle cx="16.5" cy="16.5" r="2.6" stroke={color} strokeWidth="1.9" />
    <path
      d="M18.2 5.8 5.8 18.2"
      stroke={color}
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </svg>
)

export default Percent

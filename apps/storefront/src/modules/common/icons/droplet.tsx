import { IconProps } from "types/icon"

/**
 * Grooming / hygiene droplet with sparkle. The header nav icon for "Higiene".
 */
const Droplet = ({ size = "19", color = "currentColor", ...props }: IconProps) => (
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
      d="M12 3.2c3.8 4.2 6.2 7.4 6.2 10.6a6.2 6.2 0 0 1-12.4 0c0-3.2 2.4-6.4 6.2-10.6Z"
      stroke={color}
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
    <path
      d="M9.6 14.5a2.6 2.6 0 0 0 2.4 2.2"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
)

export default Droplet

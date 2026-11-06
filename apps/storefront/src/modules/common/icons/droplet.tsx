import { IconProps } from "types/icon"

/**
 * Droplet. The header nav icon for "Higiene".
 *
 * Soap, shampoo and bathing products; a droplet is the one shape every hygiene
 * category shares regardless of what the product actually is. Same 20-unit grid
 * and 1.5 stroke as the rest of the nav icon set.
 */
const Droplet = ({ size = "18", color = "currentColor", ...props }: IconProps) => (
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
      d="M10 2.6c3 3.3 5 5.9 5 8.4a5 5 0 0 1-10 0c0-2.5 2-5.1 5-8.4Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
)

export default Droplet
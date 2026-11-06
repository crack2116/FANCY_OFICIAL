import { IconProps } from "types/icon"

/**
 * Pulse trace. The header nav icon for "Salud".
 *
 * A pulse line rather than a heart: the reference store uses a heart for its
 * "Pet Lovers" gift category, and health here means veterinary and wellness
 * products, not gifting. The flat caps keep it legible at 18px, where a thinner
 * stroke would drop out entirely.
 */
const Pulse = ({ size = "18", color = "currentColor", ...props }: IconProps) => (
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
      d="M2.5 10h3.1l1.9-4.7 2.8 9.4 2.3-5.6 1.5 1.9h2.4"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default Pulse
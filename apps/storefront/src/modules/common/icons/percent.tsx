import { IconProps } from "types/icon"

/**
 * Percent sign. The header nav icon for "Ofertas".
 *
 * Used instead of a second tag: "Accesorios" already claims the tag, and two
 * adjacent nav items sharing a shape is harder to tell apart than the shape
 * being obvious. Same 20-unit grid and 1.5 stroke as the rest of the set.
 */
const Percent = ({ size = "18", color = "currentColor", ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <circle cx="6.4" cy="6.4" r="2.4" stroke={color} strokeWidth="1.5" />
    <circle cx="13.6" cy="13.6" r="2.4" stroke={color} strokeWidth="1.5" />
    <path d="M15.2 4.8 4.8 15.2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export default Percent
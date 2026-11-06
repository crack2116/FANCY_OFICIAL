import { IconProps } from "types/icon"

/**
 * Ball. The header nav icon for "Juguetes".
 *
 * A ball with a single seam. The seam is what stops it reading as a plain
 * circle, which would be indistinguishable from the dots used elsewhere in the
 * header; it is drawn to meet the circle at both edges so no gap shows at
 * 18px.
 */
const Ball = ({ size = "18", color = "currentColor", ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <circle cx="10" cy="10" r="7.2" stroke={color} strokeWidth="1.5" />
    <path d="M10 2.8v14.4" stroke={color} strokeWidth="1.5" />
    <path
      d="M4.3 6.4c3.7 2.3 7.7 2.3 11.4 0"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

export default Ball
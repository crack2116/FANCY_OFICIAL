import { IconProps } from "types/icon"

/**
 * Pet food bowl (comedero con croquetas). The header nav icon for "Alimentos".
 *
 * Uses an outward-slanted trapezoid base (wider at the bottom, narrower at the
 * top rim) plus three scalloped kibble mounds above the rim and a paw emblem
 * on the front so it reads unmistakably as a pet food bowl.
 */
const Bowl = ({ size = "19", color = "currentColor", ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    {/* Three rounded kibble mounds rising above the rim */}
    <path
      d="M6.4 11.4a2.4 2.4 0 0 1 3.5-2.1 2.8 2.8 0 0 1 4.2 0 2.4 2.4 0 0 1 3.5 2.1"
      stroke={color}
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Outward-slanted trapezoid pet bowl (narrower top rim, wider bottom base) */}
    <path
      d="M5 11.4h14l2 6.1a1.6 1.6 0 0 1-1.52 2.1H4.52A1.6 1.6 0 0 1 3 17.5l2-6.1Z"
      stroke={color}
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
    {/* Paw emblem on the front of the bowl */}
    <circle cx="12" cy="16.2" r="1.2" fill={color} />
    <circle cx="10" cy="14.6" r="0.75" fill={color} />
    <circle cx="12" cy="14" r="0.75" fill={color} />
    <circle cx="14" cy="14.6" r="0.75" fill={color} />
  </svg>
)

export default Bowl

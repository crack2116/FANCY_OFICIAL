import { IconProps } from "types/icon"

/**
 * Paw print. The header nav icon for "Perros".
 *
 * Drawn on the same 20-unit grid and at the same 1.5 stroke weight as `bag.tsx`,
 * so the eight nav icons read as one family instead of eight clip-art pieces.
 * `currentColor` is the default, which is what lets the icon inherit the link
 * colour and stay correct on the white nav row and on the yellow header.
 *
 * `aria-hidden` is the default rather than a prop: the icon always sits beside
 * the category label, so the label is the accessible name and the icon is
 * decoration.
 */
const Paw = ({ size = "18", color = "currentColor", ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <circle cx="5.2" cy="7.8" r="1.7" stroke={color} strokeWidth="1.5" />
    <circle cx="8.4" cy="5.7" r="1.8" stroke={color} strokeWidth="1.5" />
    <circle cx="11.6" cy="5.7" r="1.8" stroke={color} strokeWidth="1.5" />
    <circle cx="14.8" cy="7.8" r="1.7" stroke={color} strokeWidth="1.5" />
    <path
      d="M10 18.6c-2.7 0-4.7-1.4-4.7-3.4 0-2 2-3.5 4.7-3.5s4.7 1.5 4.7 3.5c0 2-2 3.4-4.7 3.4Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
)

export default Paw
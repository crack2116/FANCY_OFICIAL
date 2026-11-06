import { IconProps } from "types/icon"

/**
 * Price tag. The header nav icon for "Accesorios".
 *
 * A tag rather than a collar: a collar needs a curve and a buckle to read at
 * all, and at 18px that collapses into a smudge. The tag's straight edges and
 * single hole stay legible at the rendered size.
 */
const Tag = ({ size = "18", color = "currentColor", ...props }: IconProps) => (
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
      d="M10.5 2.9H17v6.5l-7.6 7.6-6.5-6.5 7.6-7.6Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="14.2" cy="6.2" r="1.3" stroke={color} strokeWidth="1.5" />
  </svg>
)

export default Tag
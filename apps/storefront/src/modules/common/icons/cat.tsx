import { IconProps } from "types/icon"

/**
 * Expressive Cat face icon with pointed ears and whiskers. The header nav icon for "Gatos".
 */
const Cat = ({ size = "19", color = "currentColor", ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    {/* Cat head with pointed ears */}
    <path
      d="M4.6 12.2V4.7l4.2 3.3c1-.35 2.05-.55 3.2-.55s2.2.2 3.2.55l4.2-3.3v7.5c0 4.2-3.2 7.3-7.4 7.3s-7.4-3.1-7.4-7.3Z"
      stroke={color}
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
    {/* Eyes */}
    <circle cx="9.3" cy="12" r="1.15" fill={color} />
    <circle cx="14.7" cy="12" r="1.15" fill={color} />
    {/* Triangle cat nose */}
    <path d="M10.9 14.1h2.2L12 15.4l-1.1-1.3Z" fill={color} />
    {/* Cat smile */}
    <path
      d="M9.9 16.2c.65.6 1.45.6 2.1-.1.65.7 1.45.7 2.1.1"
      stroke={color}
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Side whiskers */}
    <path
      d="M2.2 12.4h2.3M2.5 14.8h2.2M19.5 12.4h2.3M19.3 14.8h2.2"
      stroke={color}
      strokeWidth="1.65"
      strokeLinecap="round"
    />
  </svg>
)

export default Cat

import { IconProps } from "types/icon"

/**
 * Pet collar / accessory tag. The header nav icon for "Accesorios".
 */
const Tag = ({ size = "19", color = "currentColor", ...props }: IconProps) => (
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
      d="M12.6 3.5H20v7.4l-8.9 8.9a1.8 1.8 0 0 1-2.5 0l-4.9-4.9a1.8 1.8 0 0 1 0-2.5l8.9-8.9Z"
      stroke={color}
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
    <circle cx="16.4" cy="7.6" r="1.5" fill={color} />
  </svg>
)

export default Tag

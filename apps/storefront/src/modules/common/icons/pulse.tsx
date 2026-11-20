import { IconProps } from "types/icon"

/**
 * Bold rounded veterinary medical cross (+). The header nav icon for "Salud".
 */
const Pulse = ({ size = "19", color = "currentColor", ...props }: IconProps) => (
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
      d="M9.6 3.5h4.8a1.1 1.1 0 0 1 1.1 1.1v3.9h3.9a1.1 1.1 0 0 1 1.1 1.1v4.8a1.1 1.1 0 0 1-1.1 1.1h-3.9v3.9a1.1 1.1 0 0 1-1.1 1.1H9.6a1.1 1.1 0 0 1-1.1-1.1v-3.9H4.6a1.1 1.1 0 0 1-1.1-1.1V9.6a1.1 1.1 0 0 1 1.1-1.1h3.9V4.6a1.1 1.1 0 0 1 1.1-1.1Z"
      stroke={color}
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
  </svg>
)

export default Pulse

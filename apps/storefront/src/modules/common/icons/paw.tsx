import { IconProps } from "types/icon"

/**
 * Friendly Dog / Puppy face icon. The header nav icon for "Perros".
 */
const Paw = ({ size = "19", color = "currentColor", ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    {/* Left & right floppy puppy ears */}
    <path
      d="M6.4 7.2C3.9 7.2 2.4 9.5 3.1 13.1c.35 1.8 1.9 2.2 2.9 1.1"
      stroke={color}
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17.6 7.2c2.5 0 4 2.3 3.3 5.9-.35 1.8-1.9 2.2-2.9 1.1"
      stroke={color}
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Rounded dog head */}
    <path
      d="M6 11c0-3.8 2.6-6.2 6-6.2s6 2.4 6 6.2c0 4.6-2.5 8.5-6 8.5S6 15.6 6 11Z"
      stroke={color}
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
    {/* Eyes */}
    <circle cx="9.6" cy="11" r="1.15" fill={color} />
    <circle cx="14.4" cy="11" r="1.15" fill={color} />
    {/* Cute oval dog nose */}
    <ellipse cx="12" cy="13.7" rx="1.6" ry="1.1" fill={color} />
    {/* Happy puppy smile */}
    <path
      d="M9.7 15.8c.7.7 1.6.8 2.3 0 .7.8 1.6.7 2.3 0"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default Paw

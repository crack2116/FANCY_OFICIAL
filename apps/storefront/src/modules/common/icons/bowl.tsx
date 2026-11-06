import { IconProps } from "types/icon"

/**
 * Food bowl. The header nav icon for "Alimentos".
 *
 * Same 20-unit grid and 1.5 stroke as the rest of the nav icon set. The mound
 * above the rim is what distinguishes this from a generic container: without it
 * the shape reads as a bag or a tub, which is the wrong category.
 */
const Bowl = ({ size = "18", color = "currentColor", ...props }: IconProps) => (
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
      d="M2.8 9.5h14.4l-1.2 6.1a2 2 0 0 1-1.95 1.55H5.95A2 2 0 0 1 4 15.6L2.8 9.5Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M6.4 9.5c0-2.3 1.6-4.1 3.6-4.1s3.6 1.8 3.6 4.1"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path d="M4.6 18.4h10.8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export default Bowl
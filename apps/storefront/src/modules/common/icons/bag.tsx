import { IconProps } from "types/icon"

const Bag = ({ size = "20", color = "currentColor", ...props }: IconProps) => (
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
      d="M3 6h14l-1 11.5a1.5 1.5 0 0 1-1.5 1.4H5.5A1.5 1.5 0 0 1 4 17.5L3 6Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M7 8V5.5a3 3 0 0 1 6 0V8"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default Bag
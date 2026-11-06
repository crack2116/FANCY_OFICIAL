import { IconProps } from "types/icon"

const Cart = ({ size = "20", color = "currentColor", ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx="9" cy="20" r="1.25" fill={color} />
    <circle cx="18" cy="20" r="1.25" fill={color} />
    <path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h8.74a2 2 0 0 0 2-1.61L22 6H5.5" />
  </svg>
)

export default Cart

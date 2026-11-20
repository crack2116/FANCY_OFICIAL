/**
 * The Fancy Pets wordmark, as inline SVG.
 *
 * Includes the playful multi-color "Fancy Pets" typography
 * and the "—— PET SHOP ——" subtitle below.
 */

export const FancyPetsLogo = ({
  className,
  height = 58,
  width = 192,
  title = "Fancy Pets",
}: {
  className?: string
  height?: number
  width?: number
  title?: string
}) => (
  <svg
    viewBox="0 0 226 64"
    width={width}
    height={height}
    className={className}
    role="img"
    aria-label={title}
    xmlns="http://www.w3.org/2000/svg"
  >
    <text
      x="6"
      y="40"
      fontFamily="var(--font-sans), 'Plus Jakarta Sans', system-ui, sans-serif"
      fontSize="35"
      fontWeight="800"
      letterSpacing="-0.5"
    >
      <tspan fill="#F25C2A">F</tspan>
      <tspan fill="#F9A03F">a</tspan>
      <tspan fill="#8B5CF6">n</tspan>
      <tspan fill="#38BDF8">c</tspan>
      <tspan fill="#EC4899">y</tspan>
      <tspan fill="transparent"> </tspan>
      <tspan fill="#EC4899">P</tspan>
      <tspan fill="#F36F21">e</tspan>
      <tspan fill="#F36F21">t</tspan>
      <tspan fill="#F36F21">s</tspan>
    </text>

    <line
      x1="8"
      y1="54"
      x2="64"
      y2="54"
      stroke="#F39C12"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <text
      x="73"
      y="57"
      fontFamily="'Montserrat', 'Futura', 'Century Gothic', system-ui, sans-serif"
      fontSize="9.5"
      fontWeight="700"
      letterSpacing="3"
      fill="#F39C12"
    >
      PET SHOP
    </text>
    <line
      x1="150"
      y1="54"
      x2="206"
      y2="54"
      stroke="#F39C12"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
)

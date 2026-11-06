/**
 * The Fancy Pets wordmark, as inline SVG.
 *
 * WHY IT LIVES HERE AND NOT IN ONE PLACE
 * ---------------------------------------
 * The same mark has to appear on the Admin login and on the storefront header.
 * Two copies would drift, which is exactly how the store name ended up
 * disagreeing between `store.name` and `site-config.ts`. This module is the one
 * definition both sides import.
 *
 * WHY PRESENTATION ATTRIBUTES AND NOT AN EMBEDDED <style>
 * -----------------------------------------------------
 * The first version of this component carried a `<style>` block inside the
 * `<svg>`. That caused two real defects:
 *
 *  - HYDRATION MISMATCH. A `<style>` child inside `<svg>` does not round-trip
 *    identically between React's server render and the client, so Next.js
 *    reported "server rendered HTML didn't match the client" at the storefront
 *    header and threw the tree away on the client.
 *  - DUPLICATED CSS. Every render emitted the block again.
 *
 * `fontFamily`, `fontSize`, `fontWeight` and `letterSpacing` are presentation
 * attributes here, so the same look needs no stylesheet at all.
 *
 * THE FONTS
 * ---------
 * `Fredoka` and `Montserrat` are the Brand Manual faces, named with a system
 * fallback stack, so the mark still renders acceptably if the webfont has not
 * loaded. The text is never converted to paths on purpose: real text is
 * selectable, searchable by the browser, and readable by assistive technology.
 */

export const FancyPetsLogo = ({
  className,
  height = 55,
  width = 180,
  title = "Fancy Pets",
}: {
  className?: string
  height?: number
  width?: number
  title?: string
}) => (
  <svg
    viewBox="0 0 216 62"
    width={width}
    height={height}
    className={className}
    role="img"
    aria-label={title}
    xmlns="http://www.w3.org/2000/svg"
  >
    <text
      x="6"
      y="38"
      fontFamily="'Fredoka', 'Quicksand', 'Arial Rounded MT Bold', system-ui, sans-serif"
      fontSize="36"
      fontWeight="700"
    >
      <tspan fill="#F24534">F</tspan>
      <tspan fill="#F99C32">a</tspan>
      <tspan fill="#3B82F6">n</tspan>
      <tspan fill="#06B6D4">c</tspan>
      <tspan fill="#8B5CF6">y</tspan>
      <tspan fill="transparent"> </tspan>
      <tspan fill="#EC4899">P</tspan>
      <tspan fill="#F24534">e</tspan>
      <tspan fill="#F97316">t</tspan>
      <tspan fill="#F24534">s</tspan>
    </text>
    <line x1="12" y1="52" x2="62" y2="52" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
    <text
      x="70"
      y="55"
      fontFamily="'Montserrat', 'Futura', 'Century Gothic', system-ui, sans-serif"
      fontSize="9.5"
      fontWeight="700"
      letterSpacing="3.5"
      fill="#D97706"
    >
      PET SHOP
    </text>
    <line x1="154" y1="52" x2="204" y2="52" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
)
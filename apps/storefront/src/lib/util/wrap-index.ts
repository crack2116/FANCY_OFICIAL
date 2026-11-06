/**
 * Wrap an index into the `[0, length)` range.
 *
 * Used by the hero carousel so prev/next wrap around instead of dead-ending at
 * the first or last slide.
 */
export const wrapIndex = (index: number, length: number): number => {
  if (length <= 0) {
    return 0
  }

  return ((index % length) + length) % length
}

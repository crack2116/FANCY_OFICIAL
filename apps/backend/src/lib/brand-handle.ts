/**
 * Slugifies a display name into a brand handle.
 *
 * Only used when the caller does not send one. It is a convenience, not the
 * validation: `brandHandleSchema` enforces the shape and the unique index on
 * `brand.handle` enforces the uniqueness.
 */
export const toBrandHandle = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)

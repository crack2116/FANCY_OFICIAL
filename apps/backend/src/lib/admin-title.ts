/**
 * Removes the vendor suffix from the Admin document title.
 *
 * WHY THIS EXISTS
 * ---------------
 * `@medusajs/dashboard@2.21.2` builds the browser tab title in its own compiled
 * bundle, `dist/app.js`:
 *
 *     return `${pageTitle} - Medusa`   // line 144053
 *     DEFAULT_TITLE = "Medusa"        // line 144070
 *
 * Both are plain string literals in vendor code. They never pass through i18n,
 * so no key in `src/admin/i18n/json/es.json` can change them. Patching
 * `node_modules` would be undone by the next install, and overriding the
 * `core:single-column` / `core:two-column` / `core:single-row` layouts would
 * mean re-implementing framework layouts for every page.
 *
 * So the title is corrected at runtime instead. This plugin injects a tiny
 * inline script into the Admin `index.html`, which runs before the dashboard
 * mounts and watches `document.head` for the framework's `<Helmet>` writes.
 *
 * WHY A WATCHER AND NOT A ONE-SHOT WRITE
 * --------------------------------------
 * The dashboard renders `<Helmet><title>{title}</title></Helmet>` from a
 * `useMemo` keyed on the router matches, so it re-applies on every navigation.
 * A one-shot assignment loses that race permanently. The observer re-applies.
 *
 * WHY IT CANNOT LOOP
 * ------------------
 * `apply` only writes when the title still contains the vendor suffix or is the
 * bare fallback. After a write the condition is false, so the mutation the write
 * itself triggers finds nothing to do and settles.
 *
 * WHAT IT CHANGES
 * ---------------
 *   "Orders - Medusa"      -> "Orders - Fancy Pets"
 *   "Iniciar sesión - Medusa" -> "Iniciar sesión - Fancy Pets"
 *   "Medusa"               -> "Fancy Pets"      (untitled routes)
 *
 * The page title itself comes from the dashboard's own i18n, so a Spanish
 * operator keeps seeing Spanish. Only the vendor suffix is rewritten.
 */

const VENDOR_SUFFIX = " - Medusa"
const VENDOR_FALLBACK = "Medusa"
const BRAND = "Fancy Pets"

const script = `
(function () {
  var SUFFIX = ${JSON.stringify(VENDOR_SUFFIX)};
  var FALLBACK = ${JSON.stringify(VENDOR_FALLBACK)};
  var BRAND = ${JSON.stringify(BRAND)};
  var apply = function () {
    var current = document.title;
    if (!current) { return; }
    if (current === FALLBACK) {
      document.title = BRAND;
      return;
    }
    if (current.indexOf(SUFFIX) === current.length - SUFFIX.length) {
      document.title = current.slice(0, current.length - SUFFIX.length) + " - " + BRAND;
    }
  };
  new MutationObserver(apply).observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  apply();
})();
`.trim()

/**
 * Injects the guard just before `</head>`.
 *
 * `</head>` is the anchor rather than the entry script tag because that tag
 * differs between the dev server (`<script type="module" src=...>`) and a
 * production build (`<script type="module" crossorigin src=...>`). Matching
 * either shape meant matching neither reliably. An inline script placed there
 * runs before the module entry below it, so the observer is installed first.
 */
export const transformAdminTitleHtml = (html: string): string => {
  const injection = `<script>${script}</script>`
  const headIndex = html.toLowerCase().lastIndexOf("</head>")

  return headIndex !== -1
    ? `${html.slice(0, headIndex)}${injection}\n  ${html.slice(headIndex)}`
    : html.replace(/<body[^>]*>/i, `${injection}\n  <body>`)
}

/**
 * Medusa merges these overrides; do not return its existing plugin array again.
 *
 * Returns an ARRAY so it composes with other admin vite overrides the same way
 * `createAdminPwaConfig` does. A bare object here would not spread.
 */
export const createAdminTitlePlugin = () => [
  {
    name: "fancy-pets-admin-title",
    transformIndexHtml: {
      order: "post" as const,
      handler: (html: string) => transformAdminTitleHtml(html),
    },
  },
]
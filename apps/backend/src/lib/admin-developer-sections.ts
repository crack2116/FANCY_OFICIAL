/**
 * Hides the Admin's developer-only sections from store operators.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every Medusa resource detail page ends with two framework-built sections:
 *
 *   Metadata   0 keys   (links to `metadata/edit`)
 *   JSON       9 keys   (the raw payload)
 *
 * Both come from the dashboard itself, `dist/chunk-GVVNJYF3.mjs`, where
 * `MetadataSection` renders when `"metadata" in data`. They are debugging
 * affordances for a developer reading the wire format. An operator managing
 * products for a clinic does not read them, and "JSON 9 claves" reads like a
 * leaked internal rather than a setting.
 *
 * HOW IT WORKS
 * ------------
 * The sections are rendered by the framework's generic detail view, so there is
 * no extension point to omit them. They are removed from the DOM after render
 * instead, through the same `index.html` injection the title fix uses, so the
 * behaviour applies to every admin page without overriding a core layout.
 *
 * TARGETING
 * ---------
 * Matched by class signature plus heading text, never by index or position:
 *
 *   .shadow-elevation-card-rest.bg-ui-bg-base  containing an <h2> whose whole
 *   text is Metadata / Metadatos / JSON
 *
 * Both Spanish and English labels are matched because the label comes from the
 * dashboard's i18n, which follows the operator's `lng` cookie.
 *
 * THE METADATA EDITOR IS NOT BLOCKED
 * ----------------------------------
 * The `Metadata` card is the only visible route into `metadata/edit`, so hiding
 * it makes that editor unreachable by clicking. The route itself still loads if
 * typed. This is a deliberate reachability trade: operators who never edit
 * metadata get a clean page, and anyone who needs the editor still has it. Set
 * `HIDE_SECTIONS` to false to restore the cards.
 */

const HIDE_SECTIONS = true

const CARD_SELECTOR = ".shadow-elevation-card-rest.bg-ui-bg-base"
const HEADING_LABELS = ["metadata", "metadatos", "json"]
const METADATA_EDIT_PATH = "/metadata/edit"

const script = `
(function () {
  if (${HIDE_SECTIONS ? "true" : "false"}) {
    var CARD = ${JSON.stringify(CARD_SELECTOR)};
    var LABELS = ${JSON.stringify(HEADING_LABELS)};
    var EDIT_PATH = ${JSON.stringify(METADATA_EDIT_PATH)};
    var strip = function () {
      if (window.location.pathname.indexOf(EDIT_PATH) !== -1) { return; }
      var cards = document.querySelectorAll(CARD);
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        if (card.dataset.fancyScanned === "1") { continue; }
        var heading = card.querySelector("h1, h2, h3");
        if (!heading) { continue; }
        card.dataset.fancyScanned = "1";
        var text = (heading.textContent || "").trim().toLowerCase();
        if (LABELS.indexOf(text) !== -1) {
          card.remove();
        }
      }
    };
    // The script is injected before closing head, where document.body is still null.
    // Observing document.body here threw and killed the whole IIFE silently.
    // documentElement exists at parse time, so it is the safe anchor.
    var attach = function () {
      if (!document.body) { return false; }
      new MutationObserver(strip).observe(document.body, {
        childList: true,
        subtree: true,
      });
      strip();
      return true;
    };
    if (!attach()) {
      document.addEventListener("DOMContentLoaded", attach);
    }
  }
})();
`.trim()

/**
 * Injects the meta tag and the strip script before `</head>`.
 *
 * The `<script>` WRAPPER IS PART OF THE OUTPUT, not decoration. Emitting the
 * bare script source renders it as visible page text and executes nothing,
 * which is exactly what happened once: the Metadata and JSON cards came back
 * and a wall of JavaScript appeared at the top of every admin page.
 */
export const transformAdminSectionsHtml = (html: string): string => {
  const injection = `${storefrontMetaTag()}\n    <script>${script}</script>`
  const headIndex = html.toLowerCase().lastIndexOf("</head>")

  return headIndex !== -1
    ? `${html.slice(0, headIndex)}${injection}\n  ${html.slice(headIndex)}`
    : html.replace(/<body[^>]*>/i, `${injection}\n  <body>`)
}

/**
 * Publish the storefront URL to the admin bundle.
 *
 * The admin is a browser bundle and has no access to the backend environment,
 * but the Marca screen needs the storefront URL to embed a preview. A meta tag
 * is used rather than an import because that value belongs to the deployment,
 * not to the source: the same admin build is served by every environment.
 *
 * Emitted without escaping beyond an attribute-safe filter, so a value with a
 * quote cannot break out of the attribute.
 */
const storefrontMetaTag = (): string => {
  const url = (process.env.FANCYPETS_STOREFRONT_URL ?? "").trim()
  const safe = url.replace(/[<>"&]/g, "")

  return `<meta name="fancy-storefront-url" content="${safe}">`
}

/** Medusa merges these overrides; do not return its existing plugin array again. */
export const createAdminSectionsPlugin = () => [
  {
    name: "fancy-pets-admin-sections",
    transformIndexHtml: {
      order: "post" as const,
      handler: (html: string) => transformAdminSectionsHtml(html),
    },
  },
]
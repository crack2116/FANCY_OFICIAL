/**
 * Removes Documentation and Changelog links from the Admin User Menu dropdown.
 *
 * WHY THIS EXISTS
 * ---------------
 * Medusa 2.21.2 hardcodes links to "Documentation" (https://docs.medusajs.com)
 * and "Changelog" (https://medusajs.com/changelog/) in `@medusajs/dashboard`'s
 * UserMenu component. For store operators in production, these external links
 * add visual noise and confusion.
 *
 * HOW IT WORKS
 * ------------
 * 1. Immediate CSS hiding: A scoped <style> block is injected before the
 *    closing head tag to hide both links and the redundant separator following
 *    them, preventing any flash of unwanted content (FOUC) when the dropdown
 *    opens.
 * 2. MutationObserver cleanup: An inline <script> monitors document.body for
 *    Radix UI's DropdownMenu portal. Once mounted, the DOM nodes and the extra
 *    separator are removed, ensuring keyboard navigation (arrow keys) and
 *    accessibility trees remain consistent.
 */

const STYLE = `
a[href*="docs.medusajs.com"],
a[href*="medusajs.com/changelog"],
a[href*="medusajs.com/changelog"] + [role="separator"],
a[href*="docs.medusajs.com"] + [role="separator"],
a[href="/settings/regions"],
a[href="/settings/tax-regions"],
a[href$="/settings/regions"],
a[href$="/settings/tax-regions"] {
  display: none !important;
}
`.trim()

const SCRIPT = `
(function () {
  var clean = function () {
    var changelogLinks = document.querySelectorAll('a[href*="medusajs.com/changelog"]');
    for (var i = 0; i < changelogLinks.length; i++) {
      var item = changelogLinks[i];
      var next = item.nextElementSibling;
      if (next && (next.getAttribute("role") === "separator" || next.classList.contains("bg-ui-border-component"))) {
        next.remove();
      }
      item.remove();
    }
    var docLinks = document.querySelectorAll('a[href*="docs.medusajs.com"]');
    for (var j = 0; j < docLinks.length; j++) {
      var docItem = docLinks[j];
      var docNext = docItem.nextElementSibling;
      if (docNext && (docNext.getAttribute("role") === "separator" || docNext.classList.contains("bg-ui-border-component"))) {
        docNext.remove();
      }
      docItem.remove();
    }
  };

  var attach = function () {
    if (!document.body) { return false; }
    new MutationObserver(clean).observe(document.body, {
      childList: true,
      subtree: true,
    });
    clean();
    return true;
  };

  if (!attach()) {
    document.addEventListener("DOMContentLoaded", attach);
  }
})();
`.trim()

export const transformAdminUserMenuHtml = (html: string): string => {
  const injection = `<style>${STYLE}</style>\n    <script>${SCRIPT}</script>`
  const headIndex = html.toLowerCase().lastIndexOf("</head>")

  return headIndex !== -1
    ? `${html.slice(0, headIndex)}${injection}\n  ${html.slice(headIndex)}`
    : html.replace(/<body[^>]*>/i, `${injection}\n  <body>`)
}

export const createAdminUserMenuPlugin = () => [
  {
    name: "fancy-pets-admin-user-menu",
    transformIndexHtml: {
      order: "post" as const,
      handler: (html: string) => transformAdminUserMenuHtml(html),
    },
  },
]

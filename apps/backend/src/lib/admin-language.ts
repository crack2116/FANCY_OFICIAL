/**
 * Makes Spanish the default Admin language without removing the official
 * language selector.
 *
 * WHY THIS EXISTS
 * ---------------
 * `@medusajs/dashboard@2.21.2` ships a complete Spanish catalogue and an
 * official language selector at Profile > Edit profile > Language. The
 * selector writes the chosen language to the `lng` cookie and localStorage.
 * Medusa's i18n detector reads those keys and falls back to English when
 * neither is present, which is why a fresh Admin session is English even
 * though this project has Spanish resources registered.
 *
 * This plugin only seeds the official key when no preference exists. An
 * operator who explicitly picked English keeps English, and switching back to
 * Spanish through the profile screen still works normally. Nothing in
 * `node_modules` is patched.
 *
 * WHY AN INLINE SCRIPT
 * --------------------
 * The i18n provider initialises before the dashboard mounts. Injecting the
 * preference into `index.html` before the module entry means the first render
 * already uses Spanish, avoiding a visible English flash. A Vite plugin is the
 * supported admin extension point already used by the title, PWA and user-menu
 * customisations in this project.
 */

const script = `
(function () {
  try {
    var hasCookie = document.cookie.split("; ").some(function (part) {
      return part.indexOf("lng=") === 0;
    });
    var stored = null;
    try {
      stored = window.localStorage.getItem("lng");
    } catch (error) {
      stored = null;
    }
    if (!hasCookie && !stored) {
      try {
        window.localStorage.setItem("lng", "es");
      } catch (error) {
        // localStorage can be unavailable in private or restricted contexts.
      }
      document.cookie = "lng=es; path=/; max-age=31536000; SameSite=Lax";
    }
  } catch (error) {
    // A language preference is a convenience, never a reason to break the Admin.
  }
})();
`.trim()

export const transformAdminLanguageHtml = (html: string): string => {
  const injection = `<script>${script}</script>`
  const headIndex = html.toLowerCase().lastIndexOf("</head>")

  return headIndex !== -1
    ? `${html.slice(0, headIndex)}${injection}\n  ${html.slice(headIndex)}`
    : html.replace(/<body[^>]*>/i, `${injection}\n  <body>`)
}

export const createAdminLanguagePlugin = () => [
  {
    name: "fancy-pets-admin-language",
    transformIndexHtml: {
      order: "post" as const,
      handler: (html: string) => transformAdminLanguageHtml(html),
    },
  },
]

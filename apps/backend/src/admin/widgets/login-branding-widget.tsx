import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useLayoutEffect } from "react"
import loginHeroImage from "../assets/login-hero.png"

const LOGIN_HERO_IMAGE = loginHeroImage

/**
 * Official Fancy Pets colorful logo SVG from Brand Manual.
 */
const FANCY_PETS_OFFICIAL_LOGO = `
  <svg data-fancy-pets-logo="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 70" width="180" height="55" role="img" aria-label="Fancy Pets Logo">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Montserrat:wght@600;700&display=swap');
      .brand-funcy { font-family: 'Fredoka', 'Quicksand', 'Arial Rounded MT Bold', system-ui, sans-serif; font-size: 32px; font-weight: 700; }
      .brand-futura { font-family: 'Montserrat', 'Futura', 'Century Gothic', sans-serif; font-size: 8.5px; font-weight: 700; letter-spacing: 3.5px; fill: #F99C32; }
    </style>
    <g transform="translate(15, 36)">
      <text class="brand-funcy">
        <tspan fill="#F24534">F</tspan>
        <tspan fill="#F99C32">a</tspan>
        <tspan fill="#3B82F6">n</tspan>
        <tspan fill="#06B6D4">c</tspan>
        <tspan fill="#8B5CF6">y</tspan>
        <tspan fill="transparent"> </tspan>
        <tspan fill="#EC4899">P</tspan>
        <tspan fill="#F7B77B">e</tspan>
        <tspan fill="#F99C32">t</tspan>
        <tspan fill="#F24534">s</tspan>
      </text>
    </g>
    <line x1="20" y1="52" x2="68" y2="52" stroke="#F99C32" stroke-width="2" stroke-linecap="round" />
    <text x="76" y="55" class="brand-futura">PET SHOP</text>
    <line x1="156" y1="52" x2="204" y2="52" stroke="#F99C32" stroke-width="2" stroke-linecap="round" />
  </svg>
`

/**
 * Presentation-only branding around Medusa's existing login card.
 * Keep React-owned auth controls intact and restore their host on unmount.
 */
const LoginBrandingWidget = () => {
  useLayoutEffect(() => {
    if (typeof document === "undefined") {
      return
    }

    if (!document.cookie.includes("lng=es")) {
      document.cookie = "lng=es; path=/; max-age=31536000"
    }

    const loginTitle = "Fancy Pets — Iniciar sesión | Panel de administración"
    const previousTitle = document.title
    const previousBodyMarker = document.body.getAttribute("data-fancy-pets-login")

    /**
     * The dashboard hardcodes the vendor suffix in its own bundle:
     *
     *   node_modules/@medusajs/dashboard/dist/app.js
     *     return `${pageTitle} - Medusa`
     *
     * That string never goes through i18n, so no translation key can change it,
     * and patching node_modules would be lost on the next install. Instead this
     * asserts the title we want and re-asserts it whenever the dashboard's
     * `<Helmet>` writes over it.
     *
     * The guard is what stops the observer from looping: writing the title
     * itself fires `characterData`, and the re-entry finds the value already
     * correct and writes nothing.
     */
    const assertLoginTitle = () => {
      if (document.title !== loginTitle) {
        document.title = loginTitle
      }
    }

    assertLoginTitle()
    document.body.setAttribute("data-fancy-pets-login", "")

    const titleObserver = new MutationObserver(assertLoginTitle)
    titleObserver.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    const styleId = "fancy-pets-official-v2-styles"
    const styleTag = document.getElementById(styleId) ?? document.createElement("style")
    styleTag.id = styleId
    styleTag.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');

        body[data-fancy-pets-login] {
          margin: 0;
          background: #fff9f2;
          color: #0b1930;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        body[data-fancy-pets-login] .fancy-login-host {
          position: relative;
          isolation: isolate;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          min-height: 100dvh;
          padding: 0 !important;
          background: #fdf6ef !important;
        }

        body[data-fancy-pets-login] #fancy-pets-official-layout,
        body[data-fancy-pets-login] #fancy-pets-official-layout * {
          box-sizing: border-box;
        }

        body[data-fancy-pets-login] #fancy-pets-official-layout {
          --fancy-split: 50%;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          position: relative;
          isolation: isolate;
          display: flex;
          align-items: stretch;
          width: 100%;
          max-width: none;
          min-height: 100dvh;
          margin: 0;
          border-radius: 0;
          overflow: hidden;
          background: #fff;
          box-shadow: none;
        }

        body[data-fancy-pets-login] .fancy-pets-scene {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 0;
          width: var(--fancy-split);
          pointer-events: none;
          background: #f3e7db;
        }

        body[data-fancy-pets-login] .fancy-pets-scene img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 52% center;
        }

        body[data-fancy-pets-login] .fancy-pets-scene::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255, 252, 247, .95) 0%, rgba(255, 252, 247, .74) 15%, rgba(255, 252, 247, .24) 34%, rgba(255, 252, 247, 0) 52%), linear-gradient(90deg, rgba(255, 252, 247, .5) 0%, rgba(255, 252, 247, 0) 44%);
        }

        body[data-fancy-pets-login] .fancy-hero-col {
          position: relative;
          z-index: 1;
          flex: 0 0 var(--fancy-split);
          min-width: 0;
          align-self: stretch;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          gap: 0;
          padding: clamp(36px, 3.4vw, 56px) clamp(30px, 3.2vw, 52px);
        }

        body[data-fancy-pets-login] .fancy-hero-top-logo {
          margin-bottom: clamp(18px, 2vw, 30px);
        }

        body[data-fancy-pets-login] [data-fancy-pets-logo] {
          display: block;
          width: clamp(150px, 12vw, 190px);
          max-width: 100%;
          height: auto;
        }

        body[data-fancy-pets-login] .fancy-hero-title {
          margin: 0;
          max-width: 94%;
          color: #0b1930;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: clamp(34px, 3.1vw, 48px);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -1.3px;
        }

        body[data-fancy-pets-login] .brand-orange {
          color: #ff7b18;
        }

        body[data-fancy-pets-login] .fancy-card-col {
          position: relative;
          z-index: 1;
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
        }

        body[data-fancy-pets-login] .fancy-login-floating-card {
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: center;
          width: 100%;
          max-width: 420px;
          padding: clamp(36px, 3vw, 48px) clamp(28px, 2.4vw, 40px);
        }

        body[data-fancy-pets-login] [data-fancy-pets-native-card] {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        body[data-fancy-pets-login] [data-fancy-pets-avatar] {
          display: none !important;
        }

        body[data-fancy-pets-login] .fancy-login-floating-card h1 {
          margin: 0 0 6px !important;
          color: #0b1930 !important;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          font-size: clamp(26px, 2vw, 30px) !important;
          line-height: 1.2 !important;
          font-weight: 700 !important;
          text-align: center;
        }

        body[data-fancy-pets-login] .fancy-login-floating-card p.text-ui-fg-subtle {
          margin: 0 0 26px !important;
          color: #6b7688 !important;
          font-size: 14px !important;
          text-align: center;
        }

        body[data-fancy-pets-login] .fancy-login-floating-card form {
          gap: 20px !important;
        }

        body[data-fancy-pets-login] .fancy-login-floating-card form > .gap-y-1 {
          gap: 20px !important;
        }

        body[data-fancy-pets-login] .fancy-login-floating-card form .space-y-2:has(input[name="email"])::before,
        body[data-fancy-pets-login] .fancy-login-floating-card form .space-y-2:has(input[name="password"])::before {
          display: block;
          margin-bottom: 6px;
          color: #18263c;
          font-size: 14px;
          font-weight: 600;
        }

        body[data-fancy-pets-login] .fancy-login-floating-card form .space-y-2:has(input[name="email"])::before {
          content: "Correo electrónico";
        }

        body[data-fancy-pets-login] .fancy-login-floating-card form .space-y-2:has(input[name="password"])::before {
          content: "Contraseña";
        }

        body[data-fancy-pets-login] .fancy-login-floating-card input[name="email"],
        body[data-fancy-pets-login] .fancy-login-floating-card input[name="password"] {
          width: 100% !important;
          height: 56px !important;
          padding: 0 16px !important;
          border: 1px solid #dfe3ea !important;
          border-radius: 12px !important;
          background: #fff !important;
          color: #18263c !important;
          font-size: 15px !important;
          box-shadow: none !important;
        }

        body[data-fancy-pets-login] .fancy-login-floating-card input[name="password"] {
          padding-right: 50px !important;
        }

        body[data-fancy-pets-login] .fancy-login-floating-card input[name="password"] ~ div {
          height: 56px !important;
          border-left: none !important;
        }

        body[data-fancy-pets-login] .fancy-login-floating-card input:focus-visible {
          border-color: #ff8a2a !important;
          outline: 3px solid rgba(255, 138, 42, .2);
          outline-offset: 2px;
        }

        body[data-fancy-pets-login] .fancy-login-floating-card button[type="submit"] {
          min-height: 54px;
          height: auto !important;
          padding: 14px 20px !important;
          border: none !important;
          border-radius: 12px !important;
          background: linear-gradient(110deg, #ff9225, #ff4137) !important;
          color: #fff !important;
          font-size: 16px !important;
          font-weight: 600 !important;
          box-shadow: 0 10px 22px rgba(255, 110, 35, .22) !important;
        }

        body[data-fancy-pets-login] .fancy-login-floating-card button[type="submit"]:hover:not(:disabled) {
          filter: brightness(.97);
        }

        body[data-fancy-pets-login] .fancy-login-floating-card button:focus-visible {
          outline: 3px solid #ffab67;
          outline-offset: 3px;
        }

        body[data-fancy-pets-login] [data-fancy-pets-native-card] > span {
          display: none;
        }

        body[data-fancy-pets-login] .fancy-security-notice {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 24px;
          color: #8a93a3;
          font-size: 12px;
          line-height: 1.5;
          text-align: center;
        }

        body[data-fancy-pets-login] .fancy-security-notice svg {
          flex-shrink: 0;
          width: 16px;
          height: 16px;
        }

        @media (max-width: 1199px) {
          body[data-fancy-pets-login] #fancy-pets-official-layout {
            --fancy-split: 100%;
            --fancy-mobile-hero-height: 220px;
            flex-direction: column;
            justify-content: flex-start;
            gap: 0;
            width: 100%;
            max-width: none;
            min-height: 100dvh;
            margin: 0;
            padding: 0;
            border-radius: 0;
            overflow: visible;
            background: #fff9f2;
            box-shadow: none;
          }

          body[data-fancy-pets-login] .fancy-pets-scene {
            width: 100%;
            height: var(--fancy-mobile-hero-height);
          }

          body[data-fancy-pets-login] .fancy-pets-scene img {
            left: 0;
            object-position: 62% center;
          }

          body[data-fancy-pets-login] .fancy-pets-scene::after {
            background: linear-gradient(90deg, #fffaf4 0%, rgba(255, 250, 244, .92) 22%, rgba(255, 250, 244, .18) 55%, transparent 75%);
          }

          body[data-fancy-pets-login] .fancy-hero-col {
            flex: none;
            align-self: stretch;
            justify-content: center;
            width: 100%;
            min-height: var(--fancy-mobile-hero-height);
            gap: 14px;
            padding: calc(16px + env(safe-area-inset-top)) max(20px, env(safe-area-inset-left)) 24px;
          }

          body[data-fancy-pets-login] .fancy-hero-top-logo {
            margin: 0;
          }

          body[data-fancy-pets-login] .fancy-hero-top-logo svg {
            width: 156px;
          }

          body[data-fancy-pets-login] .fancy-hero-title {
            width: 48%;
            max-width: 270px;
            font-size: clamp(22px, 5.4vw, 30px);
            line-height: 1.08;
            letter-spacing: -.6px;
          }

          body[data-fancy-pets-login] .fancy-card-col {
            position: relative;
            flex: none;
            width: 100%;
            margin-top: -12px;
          }

          body[data-fancy-pets-login] .fancy-login-floating-card {
            min-height: 0;
            max-width: none;
            padding: 28px max(24px, env(safe-area-inset-right)) calc(28px + env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
            border: none;
            border-radius: 28px 28px 0 0;
            background: #fff;
            box-shadow: 0 -8px 28px rgba(76, 47, 22, .06);
          }

          body[data-fancy-pets-login] .fancy-login-floating-card h1 {
            font-size: 29px !important;
          }

          body[data-fancy-pets-login] .fancy-login-floating-card p.text-ui-fg-subtle {
            margin-bottom: 12px !important;
            font-size: 15px !important;
          }

          body[data-fancy-pets-login] .fancy-login-floating-card input[name="email"],
          body[data-fancy-pets-login] .fancy-login-floating-card input[name="password"],
          body[data-fancy-pets-login] .fancy-login-floating-card input[name="password"] ~ div {
            height: 54px !important;
            font-size: 16px !important;
          }

          body[data-fancy-pets-login] .fancy-login-floating-card button:not([type="submit"]) {
            min-width: 44px;
            min-height: 44px;
          }

          body[data-fancy-pets-login] .fancy-login-floating-card button[type="submit"] {
            min-height: 56px;
            font-size: 16px !important;
          }

          body[data-fancy-pets-login] .fancy-security-notice {
            margin-top: 22px;
            font-size: 11px;
          }
        }

        @media (min-width: 600px) and (max-width: 1199px) {
          body[data-fancy-pets-login] #fancy-pets-official-layout {
            isolation: isolate;
            --fancy-mobile-hero-height: 320px;
            width: min(780px, calc(100% - 48px));
            max-width: none;
            min-height: calc(100dvh - 48px);
            margin: 24px auto;
            border-radius: 32px;
            background: #fff;
            box-shadow: 0 20px 70px rgba(76, 47, 22, .1);
          }

          body[data-fancy-pets-login] .fancy-pets-scene {
            border-radius: 32px 32px 0 0;
            overflow: hidden;
          }

          body[data-fancy-pets-login] .fancy-hero-col {
            gap: 20px;
            padding: 32px;
          }

          body[data-fancy-pets-login] .fancy-hero-top-logo svg {
            width: 192px;
          }

          body[data-fancy-pets-login] .fancy-hero-title {
            font-size: 38px;
          }

          body[data-fancy-pets-login] .fancy-login-floating-card {
            max-width: 560px;
            margin: 0 auto;
            padding: 36px 40px calc(36px + env(safe-area-inset-bottom));
            border-radius: 28px;
            box-shadow: none;
          }
        }

        @media (min-width: 768px) and (max-width: 1199px) and (orientation: landscape) {
          body[data-fancy-pets-login] #fancy-pets-official-layout {
            flex-direction: row;
            align-items: stretch;
            width: min(1080px, calc(100% - 48px));
            max-width: none;
            min-height: min(680px, calc(100dvh - 48px));
          }

          body[data-fancy-pets-login] .fancy-pets-scene {
            width: 44%;
            height: 100%;
            border-radius: 32px 0 0 32px;
          }

          body[data-fancy-pets-login] .fancy-pets-scene img {
            object-position: 67% center;
          }

          body[data-fancy-pets-login] .fancy-pets-scene::after {
            background: linear-gradient(180deg, #fffaf4 0%, rgba(255, 250, 244, .9) 23%, transparent 52%);
          }

          body[data-fancy-pets-login] .fancy-hero-col {
            width: 44%;
            min-height: 0;
            justify-content: flex-start;
            gap: 16px;
            padding: 28px 22px;
          }

          body[data-fancy-pets-login] .fancy-hero-title {
            width: 100%;
            font-size: clamp(26px, 3.4vw, 38px);
          }

          body[data-fancy-pets-login] .fancy-card-col {
            display: flex;
            align-items: center;
            width: 56%;
            margin-top: 0;
          }

          body[data-fancy-pets-login] .fancy-login-floating-card {
            padding: 28px;
            border-radius: 0 32px 32px 0;
          }
        }

        @media (max-width: 599px) and (max-height: 560px),
               (max-width: 599px) and (orientation: landscape) {
          body[data-fancy-pets-login] #fancy-pets-official-layout {
            --fancy-mobile-hero-height: 120px;
          }

          body[data-fancy-pets-login] .fancy-hero-col {
            gap: 6px;
            padding-top: 12px;
            padding-bottom: 18px;
          }

          body[data-fancy-pets-login] .fancy-hero-title {
            width: 52%;
            font-size: 20px;
          }
        }

        @media (max-width: 1199px) {
          body[data-fancy-pets-login] #fancy-pets-official-layout:has(form:focus-within) {
            --fancy-mobile-hero-height: 140px;
          }

          body[data-fancy-pets-login] #fancy-pets-official-layout:has(form:focus-within) .fancy-hero-col {
            gap: 8px;
            padding-top: 12px;
            padding-bottom: 16px;
          }

          body[data-fancy-pets-login] #fancy-pets-official-layout:has(form:focus-within) .fancy-hero-top-logo svg {
            width: 130px;
          }

          body[data-fancy-pets-login] #fancy-pets-official-layout:has(form:focus-within) .fancy-hero-title {
            font-size: 20px;
          }
        }

        @media (min-width: 1101px) and (max-height: 800px) {
          body[data-fancy-pets-login] .fancy-hero-col {
            padding: 32px 34px;
          }

          body[data-fancy-pets-login] .fancy-hero-top-logo {
            margin-bottom: 14px;
          }

          body[data-fancy-pets-login] .fancy-hero-title {
            font-size: clamp(30px, 2.8vw, 40px);
          }
        }
      `
    document.head.appendChild(styleTag)

    let layout: HTMLDivElement | null = null
    let nativeCard: HTMLElement | null = null
    let host: HTMLElement | null = null
    let anchor: Comment | null = null
    let avatar: HTMLElement | null = null
    let previousCardMarker: string | null = null
    let previousAvatarMarker: string | null = null
    let hostHadClass = false

    const restoreAttribute = (element: HTMLElement | null, name: string, value: string | null) => {
      if (value === null) {
        element?.removeAttribute(name)
      } else {
        element?.setAttribute(name, value)
      }
    }

    const applyEnhancements = () => {
      if (layout?.isConnected) {
        return
      }

      const container = document.querySelector<HTMLElement>(".bg-ui-bg-subtle")
      const originalCard = container?.querySelector<HTMLElement>(".m-4")
      if (!container || !originalCard) {
        return
      }

      // Recover a legacy decoration after hot reload without cloning native controls.
      const legacyLayout = document.getElementById("fancy-pets-official-layout")
      if (legacyLayout?.contains(originalCard)) {
        legacyLayout.before(originalCard)
        legacyLayout.remove()
      }
      originalCard.querySelector(".fancy-card-actions-row")?.remove()

      host = container
      nativeCard = originalCard
      hostHadClass = host.classList.contains("fancy-login-host")
      host.classList.add("fancy-login-host")
      previousCardMarker = nativeCard.getAttribute("data-fancy-pets-native-card")
      nativeCard.setAttribute("data-fancy-pets-native-card", "")
      avatar = nativeCard.querySelector<HTMLElement>(".shadow-buttons-neutral")
      previousAvatarMarker = avatar?.getAttribute("data-fancy-pets-avatar") ?? null
      avatar?.setAttribute("data-fancy-pets-avatar", "")

      anchor = document.createComment("Fancy Pets native login card position")
      nativeCard.before(anchor)

      layout = document.createElement("div")
      layout.id = "fancy-pets-official-layout"
      const scene = document.createElement("div")
      scene.className = "fancy-pets-scene"
      scene.setAttribute("aria-hidden", "true")
      scene.innerHTML = `<img src="${LOGIN_HERO_IMAGE}" alt="" />`

      const leftHero = document.createElement("div")
      leftHero.className = "fancy-hero-col"
      leftHero.innerHTML = `
          <div class="fancy-hero-top-logo">
            ${FANCY_PETS_OFFICIAL_LOGO}
          </div>

          <h1 class="fancy-hero-title">
            Juntos por<br/>
            mascotas más<br/>
            <span class="brand-orange">felices</span>
          </h1>
      `

      const rightCol = document.createElement("div")
      rightCol.className = "fancy-card-col"
      const card = document.createElement("div")
      card.className = "fancy-login-floating-card"

      // Reparent the original node; all form state, listeners and React fibers survive.
      card.appendChild(nativeCard)
      const securityFootnote = document.createElement("div")
      securityFootnote.className = "fancy-security-notice"
      securityFootnote.innerHTML = `
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>Acceso seguro solo para usuarios autorizados</span>
      `
      card.appendChild(securityFootnote)
      rightCol.appendChild(card)
      layout.append(scene, leftHero, rightCol)
      host.appendChild(layout)
    }

    applyEnhancements()
    const observer = new MutationObserver(applyEnhancements)
    observer.observe(document.body, { childList: true, subtree: true })

    // Layout cleanup must restore the native direct child before React removes it for MFA.
    return () => {
      observer.disconnect()
      titleObserver.disconnect()
      if (nativeCard && anchor?.parentNode) {
        anchor.parentNode.insertBefore(nativeCard, anchor)
      }
      anchor?.remove()
      layout?.remove()
      restoreAttribute(nativeCard, "data-fancy-pets-native-card", previousCardMarker)
      restoreAttribute(avatar, "data-fancy-pets-avatar", previousAvatarMarker)
      if (!hostHadClass) {
        host?.classList.remove("fancy-login-host")
      }
      styleTag.remove()
      restoreAttribute(document.body, "data-fancy-pets-login", previousBodyMarker)
      if (document.title === loginTitle) {
        document.title = previousTitle
      }
    }
  }, [])

  return null
}

export const config = defineWidgetConfig({
  zone: "login.before",
})

export default LoginBrandingWidget

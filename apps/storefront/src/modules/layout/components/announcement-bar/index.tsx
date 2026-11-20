import { getBranding } from "@lib/branding"

import AnnouncementTicker from "./announcement-ticker"

/**
 * Top announcement strip. Reads store branding on the server and delegates
 * continuous motion and interactive controls to `AnnouncementTicker`.
 */
export default async function AnnouncementBar() {
  const branding = await getBranding()

  if (!branding.announcement_enabled) {
    return null
  }

  const messages =
    branding.announcement_messages?.length
      ? branding.announcement_messages
      : ["Bienvenido a nuestra tienda", "Envíos en Piura"]

  return <AnnouncementTicker messages={messages} />
}

import { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"

export const dynamic = "force-dynamic"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseURL()
  const isStaging =
    process.env.NEXT_PUBLIC_ENVIRONMENT === "staging" ||
    process.env.STAGING === "true"

  if (isStaging) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
    }
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/checkout", "/account", "/cart", "/order"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

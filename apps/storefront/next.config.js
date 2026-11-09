const checkEnvVariables = require("./check-env-variables")
const path = require("path")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // The monorepo root holds pnpm-lock.yaml. Without this, Next can infer a
  // workspace root from an unrelated lockfile that lives outside the project.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // The browser must never be pinned to a loopback address: the storefront is
  // opened from other machines (LAN / Tailscale). All SDK calls go through this
  // same-origin proxy and Next forwards them to the backend server-side.
  async rewrites() {
    const backend = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
    return [
      // Storefront-only surface. Do not expose /admin through this proxy.
      {
        source: "/api/medusa/store/:path*",
        destination: `${backend}/store/:path*`,
      },
      {
        source: "/api/medusa/auth/:path*",
        destination: `${backend}/auth/:path*`,
      },
    ]
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig

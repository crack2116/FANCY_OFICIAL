import { loadEnv, defineConfig, Modules, MedusaError } from '@medusajs/framework/utils'
import { createAdminPwaConfig } from "./src/lib/admin-pwa"
import { createAdminTitlePlugin } from "./src/lib/admin-title"
import { createAdminSectionsPlugin } from "./src/lib/admin-developer-sections"
import { createAdminLanguagePlugin } from "./src/lib/admin-language"
import { createAdminUserMenuPlugin } from "./src/lib/admin-user-menu"

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  admin: {
    vite: (config) => {
      const pwa = createAdminPwaConfig(config)
      return {
        ...pwa,
        plugins: [
          ...pwa.plugins,
          ...createAdminTitlePlugin(),
          ...createAdminSectionsPlugin(),
          ...createAdminLanguagePlugin(),
          ...createAdminUserMenuPlugin(),
        ],
      }
    },
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    // Medusa runs server + worker in one process by default ("shared").
    // Kept env-driven so a dedicated worker instance can be added later
    // without touching this file.
    workerMode:
      (process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server") ||
      "shared",
    databaseDriverOptions: {
      pool: {
        min: 2,
        max: 15,
        idleTimeoutMillis: 30000,
      },
    },
    cookieOptions: {
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
    },
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  // Local modules. The key is the container registration key, so
  // `container.resolve("brand")` / `container.resolve("pet_product")`.
  // Custom modules are NOT auto-discovered: without these entries the module
  // never boots, its tables are never created and `src/links/*` cannot resolve
  // `linkable` from it.
  modules: {
    // RBAC is a first-party module, but `MEDUSA_FF_RBAC` alone does NOT register
    // it: the flag only switches the policy check in `router.js` ON, which then
    // rejects every admin whose JWT carries no roles. Observed exactly that:
    // with the flag on and no entry here, `/admin/products` answered 403 while
    // `create-super-admin-role` skipped itself with "Required modules (USER,
    // AUTH, RBAC) not installed". Registering the module is what creates the
    // role tables and makes the role seed run.
    [Modules.RBAC]: {
      resolve: "@medusajs/medusa/rbac",
    },
    // The file module IS first-party and `defineConfig` auto-registers it - but
    // with the local provider and NO options, so `backend_url` falls back to the
    // hardcoded `http://localhost:9000/static` inside `@medusajs/file-local`.
    // Auto-registration cannot be reconfigured, only overridden: naming the
    // module here replaces that default.
    // In production with S3 / MinIO configured, it dynamically activates @medusajs/medusa/file-s3.
    // In production, absence of S3 configuration throws a fatal error to prevent silent data loss.
    [Modules.FILE]: (() => {
      const isBuild = process.argv.includes("build") || process.env.MEDUSA_BUILDING === "true"
      const isProduction = process.env.NODE_ENV === "production" && !isBuild
      const hasS3Config = Boolean(process.env.S3_BUCKET || process.env.MEDUSA_FILE_S3_BUCKET)

      if (isProduction && !hasS3Config) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "[FATAL CONFIG ERROR] S3 / MinIO storage is strictly required in production mode (S3_BUCKET is not set). Ephemeral local storage fallback is disabled in production to prevent silent data loss."
        )
      }

      return {
        resolve: "@medusajs/medusa/file",
        options: {
          providers: [
            hasS3Config
              ? {
                  resolve: "@medusajs/medusa/file-s3",
                  id: "s3",
                  options: {
                    file_url: (
                      process.env.S3_FILE_URL ||
                      process.env.MEDUSA_FILE_S3_FILE_URL ||
                      ""
                    ).replace(/\/+$/, ""),
                    fileUrl: (
                      process.env.S3_FILE_URL ||
                      process.env.MEDUSA_FILE_S3_FILE_URL ||
                      ""
                    ).replace(/\/+$/, ""),
                    access_key_id:
                      process.env.S3_ACCESS_KEY_ID ||
                      process.env.MEDUSA_FILE_S3_ACCESS_KEY_ID,
                    accessKeyId:
                      process.env.S3_ACCESS_KEY_ID ||
                      process.env.MEDUSA_FILE_S3_ACCESS_KEY_ID,
                    secret_access_key:
                      process.env.S3_SECRET_ACCESS_KEY ||
                      process.env.MEDUSA_FILE_S3_SECRET_ACCESS_KEY,
                    secretAccessKey:
                      process.env.S3_SECRET_ACCESS_KEY ||
                      process.env.MEDUSA_FILE_S3_SECRET_ACCESS_KEY,
                    region:
                      process.env.S3_REGION ||
                      process.env.MEDUSA_FILE_S3_REGION ||
                      "us-east-1",
                    bucket:
                      process.env.S3_BUCKET ||
                      process.env.MEDUSA_FILE_S3_BUCKET,
                    endpoint:
                      process.env.S3_ENDPOINT ||
                      process.env.MEDUSA_FILE_S3_ENDPOINT,
                    additional_client_config: {
                      forcePathStyle: true,
                    },
                    additionalClientConfig: {
                      forcePathStyle: true,
                    },
                  },
                }
              : {
                  resolve: "@medusajs/medusa/file-local",
                  id: "local",
                  options: {
                    backend_url: `${(
                      process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
                    ).replace(/\/+$/, "")}/static`,
                  },
                },
          ],
        },
      }
    })(),
    brand: {
      resolve: "./src/modules/brand",
    },
    pet_product: {
      resolve: "./src/modules/pet-product",
    },
    [Modules.PAYMENT]: {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/culqi-payment",
            id: "culqi",
            options: {
              secretKey: process.env.CULQI_SECRET_KEY,
              publicKey: process.env.CULQI_PUBLIC_KEY,
              baseUrl: process.env.CULQI_API_URL,
              webhookSecret: process.env.CULQI_WEBHOOK_SECRET,
              autoCapture: process.env.CULQI_AUTO_CAPTURE !== "false",
            },
          },
        ],
      },
    },
    [Modules.AUTH]: {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
          ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? [
                {
                  resolve: "@medusajs/medusa/auth-google",
                  id: "google",
                  options: {
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    callbackUrl:
                      process.env.GOOGLE_CALLBACK_URL ||
                      `${process.env.STOREFRONT_URL || "http://localhost:8000"}/api/auth/google/callback`,
                  },
                },
              ]
            : []),
        ],
      },
    },
    ...(process.env.REDIS_URL
      ? {
          [Modules.EVENT_BUS]: {
            resolve: "@medusajs/medusa/event-bus-redis",
            options: {
              redisUrl: process.env.REDIS_URL,
            },
          },
          [Modules.WORKFLOW_ENGINE]: {
            resolve: "@medusajs/medusa/workflow-engine-redis",
            options: {
              redis: {
                redisUrl: process.env.REDIS_URL,
              },
            },
          },
          [Modules.CACHE]: {
            resolve: "@medusajs/medusa/cache-redis",
            options: {
              redisUrl: process.env.REDIS_URL,
            },
          },
        }
      : {}),
  }
})

"use strict"
/**
 * FANCYPERU - one-off container script to rotate the STAGING admin password
 * using the OFFICIAL auth module service method
 * `authModuleService.updateProvider("emailpass", {...})`, exactly as the
 * built-in HTTP route `POST /auth/user/emailpass/update` uses it.
 *
 * Executed with: medusa exec ./src/scripts/fancyperu-rotate.js
 * Inputs (container env, never logged): STAGING_ADMIN_EMAIL,
 * STAGING_ROTATION_PASSWORD.
 *
 * Notes:
 * - the emailpass provider's update() returns success=true WITHOUT changing
 *   anything when the password is absent/invalid; both values are therefore
 *   validated here before the call.
 * - this script prints only a success line and sanitized error codes. It never
 *   prints the email, the password, the provider payload or a raw framework
 *   error that could contain private values.
 * - no commercial data is touched and no other user is created or modified.
 */

const {
  Modules,
  ContainerRegistrationKeys,
} = require("@medusajs/framework/utils")

const abort = (code) => {
  throw new Error(`FANCYPERU_ROTATE_ERROR code=${code}`)
}

module.exports.default = async function stagingRotatePassword({ container }) {
  try {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const email = (process.env.STAGING_ADMIN_EMAIL || "").trim()
    const newPassword = process.env.STAGING_ROTATION_PASSWORD

    if (!email) {
      abort("E_EMAIL")
    }
    if (!newPassword || typeof newPassword !== "string") {
      abort("E_PASSWORD")
    }

    const authService = container.resolve(Modules.AUTH)
    const result = await authService.updateProvider("emailpass", {
      entity_id: email,
      password: newPassword,
    })

    if (result && result.success && result.authIdentity) {
      logger.info("ROTATION RESULT OK (auth identity preserved)")
      return
    }

    abort("E_UPDATE_PROVIDER")
  } catch (error) {
    if (String(error && error.message).includes("FANCYPERU_ROTATE_ERROR")) {
      throw error
    }
    abort("E_UNEXPECTED")
  }
}

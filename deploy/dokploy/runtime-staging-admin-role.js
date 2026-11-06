"use strict"
/**
 * FANCYPERU - one-off container script for the staging admin RBAC role.
 *
 * Executed with:
 *   medusa exec ./src/scripts/fancyperu-role.js
 *
 * Inputs (container env, never logged):
 *   STAGING_ADMIN_EMAIL      existing admin email (the wrapper fixes it)
 *   TARGET_ROLE_ID           role to link (default role_super_admin)
 *   FANCYPERU_ROLE_ACTION    status | assign | revoke
 *
 * Guarantees:
 * - never creates a user, a role or a policy;
 * - never changes a password or any commercial data;
 * - only creates/dismisses the official user <-> rbac_role module link;
 * - idempotent: an existing link is never created twice and a missing link is
 *   never dismissed twice;
 * - prints only sanitized status lines and ids, never the email or secrets.
 */

const {
  ContainerRegistrationKeys,
  Modules,
} = require("@medusajs/framework/utils")

const print = (line) => process.stdout.write(`${line}\n`)
const abort = (code) => {
  throw new Error(`FANCYPERU_ROLE_ERROR code=${code}`)
}

module.exports.default = async function stagingAdminRole({ container }) {
  try {
    const action = (process.env.FANCYPERU_ROLE_ACTION || "status").trim()
    const email = (process.env.STAGING_ADMIN_EMAIL || "").trim()
    const roleId = (process.env.TARGET_ROLE_ID || "role_super_admin").trim()

    if (!["status", "assign", "revoke"].includes(action)) {
      abort("E_ACTION")
    }
    if (!email) {
      abort("E_EMAIL")
    }
    if (!roleId) {
      abort("E_ROLE_ID")
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    const rbac = container.resolve(Modules.RBAC)

    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "email", "rbac_roles.id"],
      filters: { email },
    })

    if (!users || users.length === 0) {
      abort("E_USER_NOT_FOUND")
    }
    if (users.length > 1) {
      abort("E_USER_NOT_UNIQUE")
    }

    const user = users[0]
    const roles = await rbac.listRbacRoles({ id: roleId })

    if (!roles || roles.length !== 1) {
      abort("E_ROLE_NOT_FOUND")
    }

    const role = roles[0]
    const currentRoles = Array.isArray(user.rbac_roles)
      ? user.rbac_roles.map((entry) => entry.id).filter(Boolean)
      : []
    const hasRole = currentRoles.includes(role.id)
    const otherRoles = currentRoles.filter((id) => id !== role.id).length

    if (action === "status") {
      print(
        `FANCYPERU_ROLE_STATUS assigned=${hasRole ? "yes" : "no"} ` +
          `user_id=${user.id} role_id=${role.id} other_roles=${otherRoles}`
      )
      return
    }

    if (action === "assign") {
      if (!hasRole) {
        await link.create([
          {
            user: { user_id: user.id },
            rbac: { rbac_role_id: role.id },
          },
        ])
      }

      print(
        `FANCYPERU_ROLE_RESULT action=${
          hasRole ? "already_assigned" : "assigned"
        } user_id=${user.id} role_id=${role.id} other_roles=${otherRoles}`
      )
      return
    }

    if (hasRole) {
      await link.dismiss([
        {
          user: { user_id: user.id },
          rbac: { rbac_role_id: role.id },
        },
      ])
    }

    print(
      `FANCYPERU_ROLE_RESULT action=${
        hasRole ? "revoked" : "not_assigned"
      } user_id=${user.id} role_id=${role.id} other_roles=${otherRoles}`
    )
  } catch (error) {
    if (String(error && error.message).includes("FANCYPERU_ROLE_ERROR")) {
      throw error
    }
    abort("E_UNEXPECTED")
  }
}

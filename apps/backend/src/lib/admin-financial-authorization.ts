import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

/**
 * Server-authoritative middleware that enforces financial administrative privileges.
 *
 * Why this is necessary (H6 / N5):
 * In Medusa 2.21.2, declarative `policies` in `middlewares.ts` are gated by the
 * `MEDUSA_FF_RBAC` feature flag. When RBAC is off (default), policy wrappers are
 * not installed and route access relies solely on `authenticate("user")`, allowing
 * any authenticated staff user (e.g., manager or catalog editor) to trigger
 * sensitive financial actions such as remote auto-fix, manual payment verification,
 * or cash-on-delivery dispatch authorization.
 *
 * This middleware operates regardless of `MEDUSA_FF_RBAC` state and ensures that:
 * 1. An authenticated admin user exists in the database.
 * 2. If `FINANCIAL_AUTHORIZED_ADMIN_EMAILS` is configured, only listed emails may proceed.
 * 3. Accounts with restricted roles (e.g. "manager" without financial privilege) are blocked with HTTP 403.
 * 4. Privileged roles ("developer", "admin", "super_admin", or CLI root admins) are allowed.
 */
export async function requireAdminFinancialPrivilege(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const authContext = (req as any).auth_context
  const actorId = authContext?.actor_id
  const actorType = authContext?.actor_type

  if (!actorId || actorType !== "user") {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Financial administrative operations require an authenticated admin staff identity."
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: users } = await query.graph({
    entity: "user",
    fields: ["id", "email", "metadata"],
    filters: { id: actorId },
  }).catch(() => ({ data: [] }))

  const user = users?.[0]
  if (!user) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      `Admin user "${actorId}" does not exist or has been deactivated.`
    )
  }

  const email = (typeof user.email === "string" ? user.email.trim().toLowerCase() : "")
  const role = String(user.metadata?.role || "").trim().toLowerCase()

  // 1. Check general financial allowlist if configured
  const allowlistRaw = process.env.FINANCIAL_AUTHORIZED_ADMIN_EMAILS
  if (typeof allowlistRaw === "string" && allowlistRaw.trim() !== "") {
    const allowlist = allowlistRaw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0)

    if (allowlist.length > 0 && !allowlist.includes(email)) {
      throw new MedusaError(
        MedusaError.Types.FORBIDDEN,
        `Admin user "${email || actorId}" is not authorized by FINANCIAL_AUTHORIZED_ADMIN_EMAILS.`
      )
    }
  }

  // 2. Role-based restriction: "manager" accounts are restricted from raw financial mutations
  // unless explicitly permitted via allowlist or metadata.has_financial_privilege
  if (role === "manager" && !user.metadata?.has_financial_privilege) {
    throw new MedusaError(
      MedusaError.Types.FORBIDDEN,
      `Admin accounts with role "${role}" do not have permission to execute financial operations. Contact an administrator.`
    )
  }

  // Allow privileged roles ("developer", "admin", "super_admin", or root admin)
  next()
}

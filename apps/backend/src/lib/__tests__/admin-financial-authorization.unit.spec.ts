import { MedusaError } from "@medusajs/framework/utils"
import { requireAdminFinancialPrivilege } from "../admin-financial-authorization"

describe("admin-financial-authorization middleware (unit)", () => {
  const originalAllowlist = process.env.FINANCIAL_AUTHORIZED_ADMIN_EMAILS

  afterEach(() => {
    if (originalAllowlist !== undefined) {
      process.env.FINANCIAL_AUTHORIZED_ADMIN_EMAILS = originalAllowlist
    } else {
      delete process.env.FINANCIAL_AUTHORIZED_ADMIN_EMAILS
    }
  })

  function createMockReq(user: { id: string; email?: string; metadata?: Record<string, unknown> } | null) {
    return {
      auth_context: { actor_id: user?.id || "usr_fallback_id", actor_type: "user" },
      scope: {
        resolve: (key: string) => {
          if (key === "query") {
            return {
              graph: async () => ({
                data: user ? [user] : [],
              }),
            }
          }
          throw new Error(`Unexpected resolve key: ${key}`)
        },
      },
    } as any
  }

  it("throws FORBIDDEN (HTTP 403) for manager without financial privilege", async () => {
    const req = createMockReq({
      id: "usr_mgr_1",
      email: "manager@fancyperu.pe",
      metadata: { role: "manager" },
    })
    const next = jest.fn()

    await expect(requireAdminFinancialPrivilege(req, {} as any, next)).rejects.toMatchObject({
      type: MedusaError.Types.FORBIDDEN,
    })
    expect(next).not.toHaveBeenCalled()
  })

  it("allows manager with has_financial_privilege = true", async () => {
    const req = createMockReq({
      id: "usr_mgr_fin",
      email: "finance-mgr@fancyperu.pe",
      metadata: { role: "manager", has_financial_privilege: true },
    })
    const next = jest.fn()

    await requireAdminFinancialPrivilege(req, {} as any, next)
    expect(next).toHaveBeenCalled()
  })

  it("allows developer and admin roles by default", async () => {
    const reqDev = createMockReq({
      id: "usr_dev_1",
      email: "developer@fancyperu.pe",
      metadata: { role: "developer" },
    })
    const nextDev = jest.fn()
    await requireAdminFinancialPrivilege(reqDev, {} as any, nextDev)
    expect(nextDev).toHaveBeenCalled()

    const reqAdmin = createMockReq({
      id: "usr_admin_1",
      email: "admin@fancyperu.pe",
      metadata: { role: "admin" },
    })
    const nextAdmin = jest.fn()
    await requireAdminFinancialPrivilege(reqAdmin, {} as any, nextAdmin)
    expect(nextAdmin).toHaveBeenCalled()
  })

  it("enforces FINANCIAL_AUTHORIZED_ADMIN_EMAILS when present", async () => {
    process.env.FINANCIAL_AUTHORIZED_ADMIN_EMAILS = "cfo@fancyperu.pe,lead-dev@fancyperu.pe"

    const reqUnlisted = createMockReq({
      id: "usr_other_1",
      email: "other@fancyperu.pe",
      metadata: { role: "developer" },
    })
    const nextUnlisted = jest.fn()
    await expect(requireAdminFinancialPrivilege(reqUnlisted, {} as any, nextUnlisted)).rejects.toMatchObject({
      type: MedusaError.Types.FORBIDDEN,
    })
    expect(nextUnlisted).not.toHaveBeenCalled()

    const reqListed = createMockReq({
      id: "usr_cfo_1",
      email: "cfo@fancyperu.pe",
      metadata: { role: "developer" },
    })
    const nextListed = jest.fn()
    await requireAdminFinancialPrivilege(reqListed, {} as any, nextListed)
    expect(nextListed).toHaveBeenCalled()
  })
})

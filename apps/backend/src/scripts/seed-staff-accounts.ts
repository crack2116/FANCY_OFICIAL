/**
 * ============================================================================
 *  FancyPeru — staff admin accounts (idempotent).
 * ============================================================================
 *
 *   pnpm exec medusa exec ./src/scripts/seed-staff-accounts.ts
 *
 * WHAT IT ENSURES
 * Two named admin accounts, distinguished only by `metadata.role`:
 *
 *   role `manager`   <- FANCYPETS_MANAGER_EMAIL    / FANCYPETS_MANAGER_PASSWORD
 *   role `developer` <- FANCYPETS_DEVELOPER_EMAIL / FANCYPETS_DEVELOPER_PASSWORD
 *
 * The role exists so `src/admin/layouts/settings-sidebar.tsx` can decide whether
 * to render the "Desarrollador" group. That layout reads `/admin/users/me` and
 * compares `user.metadata.role` against `"manager"`, so the value written here
 * and the value read there have to be the same string.
 *
 * METADATA IS NOT RBAC
 * `metadata` is a free-form JSON column on the user model
 * (`@medusajs/user/dist/models/user.js`: `metadata: model.json().nullable()`).
 * This application owns the `role` key and nothing else reads it. Writing it
 * grants no permission, hides no route and revokes no route: the admin routes
 * and the `/admin/*` endpoints stay reachable by URL by any authenticated
 * session while `MEDUSA_FF_RBAC` is off. Do not describe this script as access
 * control.
 *
 * WHY RBAC ROLES ARE DELIBERATELY NOT ASSIGNED
 * `medusa/dist/commands/user.js` also resolves `Modules.RBAC`, reads
 * `role_super_admin` and passes it as `users[].roles`, but only inside
 * `if (FeatureFlag.isFeatureEnabled("rbac"))`. `MEDUSA_FF_RBAC` ships disabled
 * and this project keeps it disabled, so that branch never runs and the RBAC
 * module is never resolved. Assigning a role here would write a row in a module
 * nothing enforces yet and would give the false impression that these two
 * accounts are permissioned. This was considered on purpose; revisit it the day
 * the flag is switched on.
 *
 * CREATION MIRRORS THE CLI
 * The flow is the one in `medusa/dist/commands/user.js`, in the same order:
 * `create-users-workflow` for the user record, `authService.register` for the
 * credential, then `updateAuthIdentities` to bind `app_metadata.user_id` to the
 * user. The password is hashed by the emailpass provider and by nothing else;
 * hashing it here by hand would produce an identity that cannot log in.
 *
 * IDEMPOTENCY
 * Existing admin users are listed once and matched on email, case-insensitively.
 * A match is never recreated and its password is never rotated: only
 * `metadata.role` is reconciled, through `update-users-workflow`. A second run
 * therefore writes nothing at all and only logs.
 *
 * CREDENTIALS
 * All four variables are read and validated before the first database write. If
 * any is missing the script names each one, states that nothing was written, and
 * throws. It never invents a password, never logs one, and never prints
 * `process.env`.
 */

import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type {
  ExecArgs,
  IAuthModuleService,
  IWorkflowEngineService,
  UserDTO,
} from "@medusajs/framework/types"

/**
 * The two roles this script owns. A string union rather than a bare `string` so
 * a typo in the seed table is a compile error and not a silent bad value in
 * `metadata`.
 */
type StaffRole = "manager" | "developer"

type StaffSeed = {
  role: StaffRole
  /** Environment variable holding the login email. Never logged. */
  emailEnv: string
  /** Environment variable holding the password. Never logged. */
  passwordEnv: string
}

const STAFF_SEEDS: readonly StaffSeed[] = [
  {
    role: "manager",
    emailEnv: "FANCYPETS_MANAGER_EMAIL",
    passwordEnv: "FANCYPETS_MANAGER_PASSWORD",
  },
  {
    role: "developer",
    emailEnv: "FANCYPETS_DEVELOPER_EMAIL",
    passwordEnv: "FANCYPETS_DEVELOPER_PASSWORD",
  },
]

/**
 * `password` is nullable on purpose. An account that already exists is only
 * reconciled, never recreated, so its password is never read and never needed.
 * Requiring it up front meant a fresh run was blocked by a variable it would not
 * have used. The entry point therefore only requires a password for the accounts
 * it actually has to create.
 */
type StaffAccount = StaffSeed & { email: string; password: string | null }

/**
 * Narrow shape for the rows `query.graph` returns for `entity: "user"`. The
 * graph result is loosely typed, so every read is narrowed here instead of being
 * cast to `any`.
 */
type AdminUserRow = {
  id: string
  email?: string | null
  metadata?: Record<string, unknown> | null
}

const readEnv = (name: string): string | null => {
  const value = process.env[name]?.trim()

  return value ? value : null
}

/**
 * Reads every variable and reports all missing emails at once.
 *
 * Only the email is required here. Whether a password is needed depends on
 * whether the account already exists, which is not knowable without querying, so
 * that decision belongs to the entry point after `findExistingUsers`.
 *
 * Deliberately returns rather than throws: the entry point has to log which
 * variables are absent before raising, and a partial read would make it look
 * like only the first account was checked.
 */
const resolveAccounts = (): { accounts: StaffAccount[]; missing: string[] } => {
  const accounts: StaffAccount[] = []
  const missing: string[] = []

  for (const seed of STAFF_SEEDS) {
    const email = readEnv(seed.emailEnv)

    if (!email) {
      missing.push(seed.emailEnv)
      continue
    }

    accounts.push({ ...seed, email, password: readEnv(seed.passwordEnv) })
  }

  return { accounts, missing }
}

/**
 * Lists the admin users whose email is one of the two we care about.
 *
 * `query.graph` with `entity: "user"` is the same remote-query path the admin
 * route `api/admin/users/route.js` uses with `entryPoint: "user"`, so the
 * listing sees exactly what `/admin/users` would return. An array filter is
 * accepted by the user module's `FilterableUserProps.email`, so one round trip
 * covers both accounts.
 */
const findExistingUsers = async (
  query: { graph: (input: unknown) => Promise<{ data?: unknown }> },
  emails: string[]
): Promise<Map<string, AdminUserRow>> => {
  const { data } = await query.graph({
    entity: "user",
    fields: ["id", "email", "metadata"],
    filters: { email: emails },
  })

  const byEmail = new Map<string, AdminUserRow>()

  for (const row of (data ?? []) as AdminUserRow[]) {
    const email = row.email?.trim().toLowerCase()

    if (email) {
      byEmail.set(email, row)
    }
  }

  return byEmail
}

/**
 * Creates one staff account: user record, then credential, then the binding
 * between them. Returns the new user id.
 *
 * Takes a narrowed account because a password is structurally required here. The
 * entry point has already proven one exists for every account it routes into this
 * function; the type makes that guarantee explicit instead of casting.
 */
const createStaffUser = async (
  workflowService: IWorkflowEngineService,
  authService: IAuthModuleService,
  account: StaffAccount & { password: string }
): Promise<string> => {
  const { result: users } = await workflowService.run("create-users-workflow", {
    input: {
      users: [{ email: account.email, metadata: { role: account.role } }],
    },
  })

  const user = (users as UserDTO[] | undefined)?.[0]

  if (!user?.id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `create-users-workflow returned no user for the ${account.role} account.`
    )
  }

  const { authIdentity, error } = await authService.register("emailpass", {
    body: { email: account.email, password: account.password },
  })

  if (error || !authIdentity?.id) {
    // The provider reports a fixed sentence here ("Identity with email already
    // exists", "Password should be a string"), never the submitted password, so
    // the message is safe to surface. The user record from the step above may
    // already exist and is deliberately left in place rather than rolled back by
    // hand.
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `The emailpass provider did not create a credential for ${account.email}: ${
        error ?? "no auth identity was returned"
      }. A user row with that email may now exist without a login.`
    )
  }

  await authService.updateAuthIdentities({
    id: authIdentity.id,
    app_metadata: { user_id: user.id },
  })

  return user.id
}

/**
 * Brings one existing account's `metadata.role` in line, touching nothing else.
 *
 * The existing keys are spread back in on purpose: the module replaces the whole
 * `metadata` object, so passing only `{ role }` would silently drop whatever
 * else the record already carried.
 */
const reconcileRole = async (
  workflowService: IWorkflowEngineService,
  user: AdminUserRow,
  role: StaffRole
): Promise<void> => {
  await workflowService.run("update-users-workflow", {
    input: {
      updates: [
        {
          id: user.id,
          metadata: { ...(user.metadata ?? {}), role },
        },
      ],
    },
  })
}

export default async function seedStaffAccounts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  // ------------------------------------------------------------- variables ---
  // Emails first, so a misconfigured shell cannot create one account and then
  // fail on the second.
  const { accounts, missing } = resolveAccounts()

  if (missing.length) {
    for (const name of missing) {
      logger.warn(`${name} no esta definida.`)
    }

    logger.warn(
      "No se escribió nada en la base de datos. Define las variables que faltan y vuelve a ejecutar el script."
    )

    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Missing required environment variables: ${missing.join(", ")}. Nothing was written to the database.`
    )
  }

  logger.info("Sembrando cuentas de personal del admin (idempotente).")

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const workflowService =
    container.resolve<IWorkflowEngineService>(Modules.WORKFLOW_ENGINE)
  const authService = container.resolve<IAuthModuleService>(Modules.AUTH)

  // ------------------------------------------------------------- detection ---
  const existingByEmail = await findExistingUsers(
    query,
    accounts.map((account) => account.email)
  )

  // --------------------------------------------------- conditional secrets ---
  // A password is needed only for an account that does not exist yet. Checking
  // this before the write loop keeps the guarantee that a misconfigured run
  // leaves the database untouched, without demanding a password for an account
  // that is only being reconciled.
  const pendingPasswords = accounts.filter(
    (account) =>
      !existingByEmail.has(account.email.toLowerCase()) && !account.password
  )

  if (pendingPasswords.length) {
    for (const account of pendingPasswords) {
      logger.warn(
        `${account.passwordEnv} no esta definida y ${account.email} todavía no existe.`
      )
    }

    logger.warn(
      "No se escribió nada en la base de datos. Esa cuenta necesita una contraseña para poder crearse; las que ya existen no la requieren."
    )

    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Missing required environment variables: ${pendingPasswords
        .map((account) => account.passwordEnv)
        .join(", ")}. Nothing was written to the database.`
    )
  }

  // ------------------------------------------------------------------ run ---
  for (const account of accounts) {
    const existing = existingByEmail.get(account.email.toLowerCase())

    if (!existing) {
      if (!account.password) {
        // Unreachable: the entry point rejects exactly this case before the loop.
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `${account.email} must be created but ${account.passwordEnv} is not set.`
        )
      }

      const userId = await createStaffUser(workflowService, authService, {
        ...account,
        password: account.password,
      })

      logger.info(
        `  ${account.email} · rol ${account.role} · creada ahora (${userId})`
      )

      continue
    }

    const currentRole = existing.metadata?.role

    if (currentRole === account.role) {
      logger.info(
        `  ${account.email} · rol ${account.role} · ya existía, sin cambios`
      )

      continue
    }

    await reconcileRole(workflowService, existing, account.role)

    logger.info(
      `  ${account.email} · rol ${account.role} · ya existía, rol corregido desde "${String(
        currentRole ?? "(ninguno)"
      )}"`
    )
  }

  logger.info(
    "Ocultar el grupo Desarrollador es solo presentación: las rutas siguen siendo accesibles por URL porque MEDUSA_FF_RBAC sigue apagado."
  )
}
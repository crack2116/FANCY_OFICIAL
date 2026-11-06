import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules, PaymentSessionStatus } from "@medusajs/framework/utils"
import { CulqiClient } from "../modules/culqi-payment/client"
import { CulqiIdempotencyStore } from "../modules/culqi-payment/idempotency"
import { CulqiPaymentProviderService } from "../modules/culqi-payment/service"
import { CulqiReconciliationService } from "../modules/culqi-payment/reconciliation"
import { CulqiUncertainStateError } from "../modules/culqi-payment/errors"
import { toCulqiCentimos, fromCulqiCentimos } from "../modules/culqi-payment/utils"
import { requireAdminFinancialPrivilege } from "../lib/admin-financial-authorization"
import { resolveFulfillmentAuthorization } from "../lib/fulfillment-authorization"

interface TestResult {
  id: string
  name: string
  status: "PASS" | "FAIL"
  durationMs: number
  details: string
  error?: string
}

export default async function runStagingFinancialE2E({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const paymentModule = container.resolve(Modules.PAYMENT)

  logger.info("=================================================================")
  logger.info("  FANCYPERU — SUITE DE CERTIFICACIÓN E2E FINANCIERA (STAGING)   ")
  logger.info("=================================================================")
  logger.info(`PostgreSQL conectado: ${!!knex} (Cliente: ${knex?.client?.config?.client || "knex"})`)

  const results: TestResult[] = []

  // Ensure idempotency ledger table in real PostgreSQL
  const idempotencyStore = new CulqiIdempotencyStore(knex, logger)
  await idempotencyStore.ensureTable()

  // Verify PostgreSQL table existence
  const hasOperationsTable = await knex.schema.hasTable("culqi_operations")
  if (!hasOperationsTable) {
    throw new Error("[FATAL] PostgreSQL table 'culqi_operations' could not be verified.")
  }
  logger.info("Verificación de tabla PostgreSQL 'culqi_operations': OK")

  // Mock API client pointing to local Culqi mock or test key
  const culqiApiUrl = process.env.CULQI_API_URL || "http://127.0.0.1:8088"
  const culqiClient = new CulqiClient(
    {
      secretKey: process.env.CULQI_SECRET_KEY || "sk_test_staging_secret_key_mock",
      baseUrl: culqiApiUrl,
    },
    logger
  )

  const provider = new CulqiPaymentProviderService(
    { logger, [ContainerRegistrationKeys.PG_CONNECTION]: knex },
    {
      secretKey: process.env.CULQI_SECRET_KEY || "sk_test_staging_secret_key_mock",
      publicKey: process.env.CULQI_PUBLIC_KEY || "pk_test_staging_public_key_mock",
      baseUrl: culqiApiUrl,
      autoCapture: true,
    }
  )
  ;(provider as any).client_ = culqiClient
  ;(provider as any).idempotencyStore_ = idempotencyStore

  const reconService = new CulqiReconciliationService(culqiClient, idempotencyStore, logger)
  ;(provider as any).reconciliationService_ = reconService

  async function runTest(id: string, name: string, fn: () => Promise<string>): Promise<void> {
    const start = Date.now()
    try {
      logger.info(`\n[RUN] ${id} — ${name}...`)
      const details = await fn()
      const durationMs = Date.now() - start
      logger.info(`[PASS] ${id} — ${name} (${durationMs}ms): ${details}`)
      results.push({ id, name, status: "PASS", durationMs, details })
    } catch (err: any) {
      const durationMs = Date.now() - start
      logger.error(`[FAIL] ${id} — ${name} (${durationMs}ms): ${err.message}`)
      results.push({ id, name, status: "FAIL", durationMs, details: "Test failed with error", error: err.stack || err.message })
    }
  }

  // ---------------------------------------------------------------------------
  // ESCENARIO 1: Pago Aceptado en Medusa y Culqi
  // ---------------------------------------------------------------------------
  await runTest("E1", "Pago Culqi Aceptado y Capturado en Ledger Real", async () => {
    const sessionId = `ses_e1_${Date.now()}`
    const result = await provider.authorizePayment({
      data: {
        session_id: sessionId,
        amount: 8500, // S/ 85.00
        currency_code: "PEN",
        token_id: "tok_test_valid_card",
        email: "shopper_e1@fancyperu.pe",
      },
      context: { idempotency_key: sessionId },
    })

    if (result.status !== PaymentSessionStatus.CAPTURED && result.status !== PaymentSessionStatus.AUTHORIZED) {
      throw new Error(`Estado inesperado: ${result.status}`)
    }
    const chargeId = result.data?.charge_id as string
    if (!chargeId) {
      throw new Error("No se generó charge_id en la respuesta")
    }

    // Verify row in real PostgreSQL
    const op = await idempotencyStore.getBySessionId(sessionId)
    if (!op || op.status !== "completed" || op.charge_id !== chargeId) {
      throw new Error(`Ledger PostgreSQL no refleja la transacción: ${JSON.stringify(op)}`)
    }

    return `Charge ${chargeId} registrado y completado en PostgreSQL (monto: ${op.amount} céntimos)`
  })

  // ---------------------------------------------------------------------------
  // ESCENARIO 2: Webhook Duplicado (Idempotencia Pura)
  // ---------------------------------------------------------------------------
  await runTest("E2", "Webhook Duplicado procesado con Idempotencia Estricta", async () => {
    const eventId = `evt_e2_${Date.now()}`
    const chargeId = `chr_e2_${Date.now()}`

    // 1st delivery
    const lock1 = await idempotencyStore.acquireLock(`webhook:${eventId}`, {
      operation_type: "webhook",
      charge_id: chargeId,
      amount: 15000,
      currency_code: "PEN",
      event_type: "charge.succeeded",
    })
    if (!lock1.acquired) throw new Error("No se pudo adquirir el primer lock de webhook")

    await idempotencyStore.complete(`webhook:${eventId}`, {
      charge_id: chargeId,
      amount: 15000,
      status: "completed",
    })

    // 2nd delivery (duplicate after 1 second)
    const lock2 = await idempotencyStore.acquireLock(`webhook:${eventId}`, {
      operation_type: "webhook",
      charge_id: chargeId,
      amount: 15000,
      currency_code: "PEN",
      event_type: "charge.succeeded",
    })

    if (!lock2.isDuplicate || lock2.record.status !== "completed") {
      throw new Error(`El segundo webhook no fue detectado como duplicado completado: isDuplicate=${lock2.isDuplicate}`)
    }

    return `Evento duplicado ${eventId} absorbido limpiamente por PostgreSQL sin duplicar efectos`
  })

  // ---------------------------------------------------------------------------
  // ESCENARIO 3: Webhooks Concurrentes (N4 - HTTP 409)
  // ---------------------------------------------------------------------------
  await runTest("E3", "Webhooks Concurrentes detectan Processing y rechazan con Conflict", async () => {
    const eventId = `evt_e3_concurrent_${Date.now()}`
    const chargeId = `chr_e3_concurrent_${Date.now()}`

    // First process acquires lock and remains in 'processing'
    const lock1 = await idempotencyStore.acquireLock(`webhook:${eventId}`, {
      operation_type: "webhook",
      charge_id: chargeId,
      amount: 25000,
      currency_code: "PEN",
      event_type: "charge.succeeded",
    })
    if (!lock1.acquired) throw new Error("Primer lock no fue adquirido")

    // Concurrent delivery arrives while lock1 is still 'processing'
    const lock2 = await idempotencyStore.acquireLock(`webhook:${eventId}`, {
      operation_type: "webhook",
      charge_id: chargeId,
      amount: 25000,
      currency_code: "PEN",
      event_type: "charge.succeeded",
    })

    if (!lock2.isDuplicate || lock2.record.status !== "processing") {
      throw new Error(`El segundo webhook concurrente no detectó estado 'processing': status=${lock2.record.status}`)
    }

    // Cleanup: complete the active lock
    await idempotencyStore.complete(`webhook:${eventId}`, {
      charge_id: chargeId,
      amount: 25000,
      status: "completed",
    })

    return `Concurrencia detectada en PostgreSQL: lock en 'processing' genera señal 409 de reintento`
  })

  // ---------------------------------------------------------------------------
  // ESCENARIO 4: Timeout tras Cargo (H3/N3 - Fail-Closed)
  // ---------------------------------------------------------------------------
  await runTest("E4", "Timeout en Creación de Cargo es Fail-Closed sin Doble Cobro", async () => {
    const sessionId = `ses_e4_timeout_${Date.now()}`
    const key = CulqiIdempotencyStore.sessionKey(sessionId)

    // Simulate timeout: lock acquired, marked uncertain
    await idempotencyStore.acquireLock(key, {
      operation_type: "authorize",
      session_id: sessionId,
      amount: 9900,
    })
    await idempotencyStore.fail(key, "ETIMEDOUT: Socket closed before response", { uncertain: true })

    // Customer retries without customer email / identifiers
    let threwUncertain = false
    try {
      await provider.authorizePayment({
        data: {
          session_id: sessionId,
          amount: 9900,
          currency_code: "PEN",
          // email missing intentionally
        },
        context: {},
      })
    } catch (err: any) {
      if (err instanceof CulqiUncertainStateError || err.message?.includes("seguridad financiera")) {
        threwUncertain = true
      } else {
        throw err
      }
    }

    if (!threwUncertain) {
      throw new Error("El reintento no arrojó CulqiUncertainStateError; se permitió cobro inseguro")
    }

    return "Operación incierta bloqueada correctamente de forma fail-closed ante falta de certeza remota"
  })

  // ---------------------------------------------------------------------------
  // ESCENARIO 5: Auto-Fix Correcto por orderId (H1 / N1 / N7)
  // ---------------------------------------------------------------------------
  await runTest("E5", "Auto-Fix por orderId Sincroniza y Captura en Medusa", async () => {
    const sessionId = `ses_e5_reconcile_${Date.now()}`
    const pColId = `pcol_e5_${Date.now()}`
    const orderId = `ord_e5_${Date.now()}`

    // Pre-create remote charge on mock server
    const remoteCharge = await culqiClient.createCharge({
      amount: 12000,
      currency_code: "PEN",
      email: "shopper_e5@fancyperu.pe",
      source_id: "tok_test_e5_mock",
      capture: true,
      metadata: { session_id: sessionId },
    })

    // Mock Medusa Container resolution for this order
    const mockContainer = {
      resolve: (key: string) => {
        if (key === "payment") {
          return {
            updatePaymentSession: async (input: any) => input,
            capturePayment: async (input: any) => ({ id: "pay_captured", ...input }),
            authorizePaymentSession: async () => ({ id: "pay_new" }),
          }
        }
        if (key === "query") {
          return {
            graph: async () => ({
              data: [
                {
                  id: orderId,
                  status: "pending",
                  currency_code: "PEN",
                  payment_collections: [
                    {
                      id: pColId,
                      status: "pending",
                      amount: 120,
                      currency_code: "PEN",
                      payments: [{ id: "pay_e5_item", status: "authorized", amount: 120 }],
                      payment_sessions: [
                        {
                          id: sessionId,
                          status: "pending",
                          amount: 120,
                          currency_code: "PEN",
                          provider_id: "pp_culqi_culqi",
                          payment_collection_id: pColId,
                          data: { charge_id: remoteCharge.id, amount: 12000 },
                        },
                      ],
                    },
                  ],
                  customer: { email: "shopper_e5@fancyperu.pe" },
                },
              ],
            }),
          }
        }
        return container.resolve(key as any)
      },
    }

    const report = await reconService.reconcile(mockContainer as any, {
      orderId,
      autoFix: true,
    })

    if (!report.matched || !report.reconciled || report.action_taken !== "captured") {
      throw new Error(`Reporte de auto-fix inconsistente: ${JSON.stringify(report)}`)
    }

    return `Orden ${orderId} conciliada exitosamente con Culqi (acción: ${report.action_taken}, monto: ${report.currency} ${fromCulqiCentimos(report.remote_amount_cents || 0)})`
  })

  // ---------------------------------------------------------------------------
  // ESCENARIO 6: Auto-Fix Fallido por Discrepancias (Sin Falso Éxito)
  // ---------------------------------------------------------------------------
  await runTest("E6", "Auto-Fix Fallido por Falta de Identificadores Rechaza con Discrepancia", async () => {
    const orderId = `ord_e6_missing_${Date.now()}`
    const mockContainer = {
      resolve: (key: string) => {
        if (key === "query") {
          return {
            graph: async () => ({
              data: [
                {
                  id: orderId,
                  status: "pending",
                  payment_collections: [], // No payment sessions
                },
              ],
            }),
          }
        }
        return container.resolve(key as any)
      },
    }

    const report = await reconService.reconcile(mockContainer as any, {
      orderId,
      autoFix: true,
    })

    if (report.matched || report.reconciled || report.action_taken !== "none") {
      throw new Error(`Falso éxito detectado en orden sin sesiones: ${JSON.stringify(report)}`)
    }

    return `Orden sin sesiones marcada correctamente como no conciliada (matched: false, action_taken: none)`
  })

  // ---------------------------------------------------------------------------
  // ESCENARIO 7: Reembolsos Concurrentes (H5 / N2)
  // ---------------------------------------------------------------------------
  await runTest("E7", "Reembolsos Concurrentes Bloqueados por Guard de Concurrencia", async () => {
    // Create base charge
    const charge = await culqiClient.createCharge({
      amount: 20000, // S/ 200.00
      currency_code: "PEN",
      email: "shopper_e7@fancyperu.pe",
      source_id: "tok_test_e7_mock",
      capture: true,
    })

    const targetKey = `refund:${charge.id}:target:5000`

    // Acquire lock simulating in-flight refund
    await idempotencyStore.acquireLock(targetKey, {
      operation_type: "refund",
      charge_id: charge.id,
      amount: 5000,
    })

    // Concurrent second refund attempt
    let blocked = false
    try {
      await provider.refundPayment({
        amount: 50,
        data: { charge_id: charge.id, currency_code: "PEN", amount_refunded: 0 },
      })
    } catch (err: any) {
      if (err instanceof CulqiUncertainStateError || err.message?.includes("concurrente")) {
        blocked = true
      } else {
        throw err
      }
    }

    if (!blocked) {
      throw new Error("El segundo reembolso concurrente no fue bloqueado")
    }

    // Cleanup lock
    await idempotencyStore.fail(targetKey, "Test cleanup")

    return `Reembolso concurrente en estado 'processing' bloqueado con CulqiUncertainStateError`
  })

  // ---------------------------------------------------------------------------
  // ESCENARIO 8: Administrador No Autorizado (H6 / N5 - HTTP 403)
  // ---------------------------------------------------------------------------
  await runTest("E8", "Administrador con Rol 'Manager' Rechazado de Rutas Financieras (403)", async () => {
    const req: any = {
      auth_context: {
        actor_id: "usr_manager_staff_test",
        actor_type: "user",
      },
      scope: {
        resolve: (key: string) => {
          if (key === "query") {
            return {
              graph: async () => ({
                data: [
                  {
                    id: "usr_manager_staff_test",
                    email: "gerente_tienda@fancyperu.pe",
                    metadata: { role: "manager" },
                  },
                ],
              }),
            }
          }
          return container.resolve(key as any)
        },
      },
    }

    let forbidden = false
    try {
      await requireAdminFinancialPrivilege(req, {} as any, (() => {}) as any)
    } catch (err: any) {
      if (err instanceof MedusaError && (err.type === MedusaError.Types.FORBIDDEN || err.message?.includes("permission"))) {
        forbidden = true
      }
    }

    if (!forbidden) {
      throw new Error("El usuario 'manager' no fue bloqueado por requireAdminFinancialPrivilege")
    }

    return "requireAdminFinancialPrivilege bloquea efectivamente a cuentas sin privilegios financieros bajo MEDUSA_FF_RBAC=false"
  })

  // ---------------------------------------------------------------------------
  // ESCENARIO 9: PostgreSQL no Disponible (N6 - Prohibición de Memoria)
  // ---------------------------------------------------------------------------
  await runTest("E9", "PostgreSQL no Disponible Bloquea Operaciones Financieras en Producción", async () => {
    const prevEnv = process.env.NODE_ENV
    const prevAllow = process.env.ALLOW_MEMORY_IDEMPOTENCY
    process.env.NODE_ENV = "production"
    delete process.env.ALLOW_MEMORY_IDEMPOTENCY

    try {
      const memoryOnlyStore = new CulqiIdempotencyStore(undefined, logger)
      let threwUnexpected = false

      try {
        await memoryOnlyStore.acquireLock("test_n6_production_fail", {
          operation_type: "authorize",
        })
      } catch (err: any) {
        if (err instanceof MedusaError && err.type === MedusaError.Types.UNEXPECTED_STATE) {
          threwUnexpected = true
        }
      }

      if (!threwUnexpected) {
        throw new Error("El store degradó silenciosamente a memoria en NODE_ENV=production sin lanzar error")
      }

      return "CulqiIdempotencyStore prohíbe taxativamente la degradación a memoria en producción sin PostgreSQL"
    } finally {
      process.env.NODE_ENV = prevEnv
      if (prevAllow !== undefined) process.env.ALLOW_MEMORY_IDEMPOTENCY = prevAllow
    }
  })

  // ---------------------------------------------------------------------------
  // ESCENARIO 10: Recuperación tras Expiración de Lease (30s)
  // ---------------------------------------------------------------------------
  await runTest("E10", "Recuperación de Lock tras Expiración de Lease (Crash Resilience)", async () => {
    const sessionId = `ses_e10_crash_${Date.now()}`
    const key = CulqiIdempotencyStore.sessionKey(sessionId)

    // Pre-insert a lock in PostgreSQL with locked_at 35 seconds in the past
    const pastDate = new Date(Date.now() - 35000)
    await knex("culqi_operations").insert({
      id: `culqi_op_e10_${Date.now()}`,
      idempotency_key: key,
      operation_type: "authorize",
      session_id: sessionId,
      amount: 15000,
      currency_code: "PEN",
      status: "processing",
      locked_at: pastDate,
      created_at: pastDate,
      updated_at: pastDate,
    })

    // Try to acquire lock again
    const lock = await idempotencyStore.acquireLock(key, {
      operation_type: "authorize",
      session_id: sessionId,
      amount: 15000,
    })

    if (!lock.recovered) {
      throw new Error(`El lock expirado no fue marcado como 'recovered': recovered=${lock.recovered}`)
    }

    // Cleanup
    await idempotencyStore.fail(key, "Test E10 finished")

    return `Lock con lease vencido (>30s) recuperado como 'recovered: true' en PostgreSQL`
  })

  // ---------------------------------------------------------------------------
  // ESCENARIO 11: Regresión P0-A (Importes Exactos en Céntimos)
  // ---------------------------------------------------------------------------
  await runTest("E11", "Regresión P0-A: Conversión Exacta de Importes sin Desvío de Centavos", async () => {
    const testCases = [
      { major: 169.96, expectedCentimos: 16996 },
      { major: "169.96", expectedCentimos: 16996 },
      { major: { value: "169.96", precision: 20 }, expectedCentimos: 16996 },
      { major: 0.5, expectedCentimos: 50 },
      { major: 1200, expectedCentimos: 120000 },
    ]

    for (const tc of testCases) {
      const centimos = toCulqiCentimos(tc.major, "PEN")
      if (centimos !== tc.expectedCentimos) {
        throw new Error(`Desvío en P0-A para ${JSON.stringify(tc.major)}: obtenido ${centimos}, esperado ${tc.expectedCentimos}`)
      }
      const back = fromCulqiCentimos(centimos)
      if (typeof tc.major === "number" && back !== tc.major) {
        throw new Error(`Desvío inverso en P0-A para ${centimos} céntimos: obtenido ${back}, esperado ${tc.major}`)
      }
    }

    return "Conversión de importes P0-A verificada con precisión exacta para BigNumber, strings y floats"
  })

  // ---------------------------------------------------------------------------
  // ESCENARIO 12: Regresión P0-B (Despacho sin Pago Bloqueado)
  // ---------------------------------------------------------------------------
  await runTest("E12", "Regresión P0-B: Despacho sin Pago Bloqueado en Fulfillment Gate", async () => {
    const unverifiedOrderAuth = resolveFulfillmentAuthorization({
      paymentCollectionStatus: "pending",
      orderStatus: "pending",
      orderMetadata: {},
      orderId: "ord_e12_unpaid",
      serverSecret: "test_secret_for_signing",
    })

    if (unverifiedOrderAuth.allowed) {
      throw new Error("Orden impaga fue autorizada para despacho incorrectamente")
    }

    const forgedMetadataAuth = resolveFulfillmentAuthorization({
      paymentCollectionStatus: "pending",
      orderStatus: "pending",
      orderMetadata: {
        is_cash_on_delivery: true, // Forged buyer metadata
        fancyperu_cod: { status: "authorized" }, // unsigned
      },
      orderId: "ord_e12_forged",
      serverSecret: "test_secret_for_signing",
    })

    if (forgedMetadataAuth.allowed) {
      throw new Error("Metadata falsa de comprador vulneró el gate de despacho P0-B")
    }

    return "Fulfillment Gate bloquea pedidos no pagados y metadatos falsificados de comprador"
  })

  // ---------------------------------------------------------------------------
  // REPORTE FINAL DE CERTIFICACIÓN
  // ---------------------------------------------------------------------------
  logger.info("\n=================================================================")
  logger.info("  RESUMEN FINAL DE CERTIFICACIÓN E2E FINANCIERA (STAGING)        ")
  logger.info("=================================================================")

  let allPassed = true
  for (const r of results) {
    const symbol = r.status === "PASS" ? "✔" : "✖"
    logger.info(`${symbol} [${r.status}] ${r.id}: ${r.name} (${r.durationMs}ms)`)
    if (r.status !== "PASS") allPassed = false
  }

  logger.info("-----------------------------------------------------------------")
  const totalPassed = results.filter((r) => r.status === "PASS").length
  logger.info(`Total Escenarios: ${results.length} | Aprobados: ${totalPassed} | Fallidos: ${results.length - totalPassed}`)

  if (!allPassed) {
    logger.error("CERTIFICACIÓN FINANCIERA E2E: RECHAZADA (HAY FALLOS)")
    throw new Error("Staging E2E Suite falló en uno o más escenarios.")
  }

  logger.info("CERTIFICACIÓN FINANCIERA E2E: APROBADA (12/12 ESCENARIOS PASS)")
  logger.info("=================================================================\n")
}

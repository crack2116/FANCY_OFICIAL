import type { Logger } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

export type CulqiOperationType =
  | "authorize"
  | "capture"
  | "refund"
  | "webhook"
  | "reconciliation"

export type CulqiOperationStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "uncertain"

export interface CulqiOperationRecord {
  id: string
  idempotency_key: string
  operation_type: CulqiOperationType
  session_id?: string
  charge_id?: string
  amount?: number // Integer céntimos
  currency_code?: string
  status: CulqiOperationStatus
  event_type?: string
  event_date?: number
  response_payload?: Record<string, unknown>
  error_message?: string
  locked_at?: Date | string
  created_at: Date | string
  updated_at: Date | string
}

export interface AcquireLockOptions {
  operation_type: CulqiOperationType
  session_id?: string
  charge_id?: string
  amount?: number
  currency_code?: string
  event_type?: string
  event_date?: number
}

export interface AcquireLockResult {
  acquired: boolean
  isDuplicate: boolean
  record: CulqiOperationRecord
  recovered?: boolean
}

const LOCK_LEASE_MS = 30000 // 30 seconds before a processing lock is considered orphaned

/**
 * Persistent Idempotency and Transaction Ledger for Culqi operations.
 *
 * Provides transactional locking, crash-resilience, race condition prevention,
 * and out-of-order event gating using PostgreSQL (via Knex) with an in-memory
 * fallback for test environments without a DB.
 */
export class CulqiIdempotencyStore {
  private knex?: any
  private logger?: Logger
  private static memoryStore: Map<string, CulqiOperationRecord> = new Map()
  private tableEnsured = false

  constructor(knex?: any, logger?: Logger) {
    this.knex = knex
    this.logger = logger
  }

  private hasKnex(): boolean {
    return !!this.knex && typeof this.knex === "function" && !!this.knex.schema
  }

  private assertPersistence(): void {
    if (
      !this.hasKnex() &&
      process.env.NODE_ENV === "production" &&
      process.env.ALLOW_MEMORY_IDEMPOTENCY !== "true"
    ) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "[CulqiIdempotency] PostgreSQL is required for financial idempotency in production. In-memory degradation is prohibited."
      )
    }
  }

  static sessionKey(sessionId: string): string {
    return `idem:${sessionId}`
  }

  /**
   * Ensures the `culqi_operations` table and indexes exist in PostgreSQL.
   */
  async ensureTable(): Promise<void> {
    if (this.tableEnsured || !this.hasKnex()) return

    try {
      const hasTable = await this.knex.schema.hasTable("culqi_operations")
      if (!hasTable) {
        await this.knex.schema.createTable("culqi_operations", (table: any) => {
          table.string("id", 128).primary()
          table.string("idempotency_key", 255).notNullable().unique()
          table.string("operation_type", 50).notNullable()
          table.string("session_id", 255).nullable().index()
          table.string("charge_id", 255).nullable().index()
          table.bigInteger("amount").nullable()
          table.string("currency_code", 10).defaultTo("PEN")
          table.string("status", 50).notNullable().index()
          table.string("event_type", 100).nullable()
          table.bigInteger("event_date").nullable()
          table.jsonb("response_payload").nullable()
          table.text("error_message").nullable()
          table.timestamp("locked_at", { useTz: true }).nullable()
          table.timestamp("created_at", { useTz: true }).defaultTo(this.knex.fn.now())
          table.timestamp("updated_at", { useTz: true }).defaultTo(this.knex.fn.now())
        })
        this.logger?.info?.("[CulqiIdempotency] Created PostgreSQL table 'culqi_operations'.")
      }
      this.tableEnsured = true
    } catch (err: any) {
      this.logger?.warn?.(
        `[CulqiIdempotency] Could not ensure culqi_operations table (might already exist): ${err.message}`
      )
      if (
        err.message?.includes("already exists") ||
        (await this.knex.schema.hasTable("culqi_operations").catch(() => false))
      ) {
        this.tableEnsured = true
      }
    }
  }

  /**
   * Atomically acquires an operation lock or returns existing record.
   */
  async acquireLock(
    key: string,
    options: AcquireLockOptions
  ): Promise<AcquireLockResult> {
    this.assertPersistence()
    await this.ensureTable()

    if (this.hasKnex()) {
      return this.acquireLockPg(key, options)
    }
    return this.acquireLockMemory(key, options)
  }

  private async acquireLockPg(
    key: string,
    options: AcquireLockOptions
  ): Promise<AcquireLockResult> {
    const id = `culqi_op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const now = new Date()

    try {
      // 1. Try atomic insert ON CONFLICT DO NOTHING
      const inserted = await this.knex("culqi_operations")
        .insert({
          id,
          idempotency_key: key,
          operation_type: options.operation_type,
          session_id: options.session_id,
          charge_id: options.charge_id,
          amount: options.amount,
          currency_code: options.currency_code || "PEN",
          status: "processing",
          event_type: options.event_type,
          event_date: options.event_date,
          locked_at: now,
          created_at: now,
          updated_at: now,
        })
        .onConflict("idempotency_key")
        .ignore()
        .returning("*")

      if (inserted && inserted.length > 0) {
        return {
          acquired: true,
          isDuplicate: false,
          record: inserted[0],
        }
      }

      // 2. Row already exists: read under lock or inspection
      const existing = await this.knex("culqi_operations")
        .where({ idempotency_key: key })
        .first()

      if (!existing) {
        // Highly improbable fallback
        return {
          acquired: false,
          isDuplicate: true,
          record: {
            id,
            idempotency_key: key,
            operation_type: options.operation_type,
            status: "uncertain",
            created_at: now,
            updated_at: now,
          },
        }
      }

      // Out-of-order check: if existing is completed and incoming event is older
      if (
        existing.status === "completed" &&
        options.event_date &&
        existing.event_date &&
        options.event_date < existing.event_date
      ) {
        this.logger?.info?.(
          `[CulqiIdempotency] Out-of-order event ignored for key ${key}: incoming ${options.event_date} < current ${existing.event_date}`
        )
        return {
          acquired: false,
          isDuplicate: true,
          record: existing,
        }
      }

      // Check if existing operation is completed
      if (existing.status === "completed") {
        return {
          acquired: false,
          isDuplicate: true,
          record: existing,
        }
      }

      // Check for orphan / crashed lease recovery
      const lockedAt = existing.locked_at ? new Date(existing.locked_at).getTime() : 0
      const isLeaseExpired = now.getTime() - lockedAt > LOCK_LEASE_MS

      if (isLeaseExpired || existing.status === "uncertain") {
        this.logger?.warn?.(
          `[CulqiIdempotency] Recovering expired or uncertain lock for ${key} (previous status: ${existing.status})`
        )

        const [recovered] = await this.knex("culqi_operations")
          .where({ idempotency_key: key })
          .update({
            status: "processing",
            locked_at: now,
            updated_at: now,
          })
          .returning("*")

        return {
          acquired: true,
          isDuplicate: false,
          record: recovered || existing,
          recovered: true,
        }
      }

      // Operation currently active in another concurrent process: wait briefly
      await new Promise((res) => setTimeout(res, 350))
      const rechecked = await this.knex("culqi_operations")
        .where({ idempotency_key: key })
        .first()

      return {
        acquired: false,
        isDuplicate: true,
        record: rechecked || existing,
      }
    } catch (err: any) {
      this.logger?.error?.(`[CulqiIdempotency] Error in acquireLockPg: ${err.message}`)
      throw err
    }
  }

  private async acquireLockMemory(
    key: string,
    options: AcquireLockOptions
  ): Promise<AcquireLockResult> {
    const now = new Date()
    const existing = CulqiIdempotencyStore.memoryStore.get(key)

    if (!existing) {
      const record: CulqiOperationRecord = {
        id: `culqi_op_mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        idempotency_key: key,
        operation_type: options.operation_type,
        session_id: options.session_id,
        charge_id: options.charge_id,
        amount: options.amount,
        currency_code: options.currency_code || "PEN",
        status: "processing",
        event_type: options.event_type,
        event_date: options.event_date,
        locked_at: now,
        created_at: now,
        updated_at: now,
      }
      CulqiIdempotencyStore.memoryStore.set(key, record)
      return { acquired: true, isDuplicate: false, record }
    }

    if (existing.status === "completed") {
      return { acquired: false, isDuplicate: true, record: existing }
    }

    const lockedAt = existing.locked_at ? new Date(existing.locked_at).getTime() : 0
    const isExpired = now.getTime() - lockedAt > LOCK_LEASE_MS

    if (isExpired || existing.status === "uncertain") {
      existing.status = "processing"
      existing.locked_at = now
      existing.updated_at = now
      return { acquired: true, isDuplicate: false, record: existing, recovered: true }
    }

    return { acquired: false, isDuplicate: true, record: existing }
  }

  /**
   * Completes an operation successfully and stores response payload.
   */
  async complete(
    key: string,
    result: {
      charge_id?: string
      amount?: number
      status?: CulqiOperationStatus
      event_type?: string
      event_date?: number
      response_payload?: Record<string, unknown>
    }
  ): Promise<CulqiOperationRecord> {
    this.assertPersistence()
    const now = new Date()
    const finalStatus: CulqiOperationStatus = result.status || "completed"

    if (this.hasKnex()) {
      const [updated] = await this.knex("culqi_operations")
        .where({ idempotency_key: key })
        .update({
          charge_id: result.charge_id,
          amount: result.amount,
          status: finalStatus,
          event_type: result.event_type,
          event_date: result.event_date,
          response_payload: result.response_payload ? JSON.stringify(result.response_payload) : undefined,
          locked_at: null,
          updated_at: now,
        })
        .returning("*")

      return updated
    }

    const existing = CulqiIdempotencyStore.memoryStore.get(key)
    if (existing) {
      existing.charge_id = result.charge_id || existing.charge_id
      existing.amount = result.amount ?? existing.amount
      existing.status = finalStatus
      existing.event_type = result.event_type || existing.event_type
      existing.event_date = result.event_date ?? existing.event_date
      existing.response_payload = result.response_payload
      existing.locked_at = undefined
      existing.updated_at = now
      return existing
    }

    const newRecord: CulqiOperationRecord = {
      id: `culqi_op_${Date.now()}`,
      idempotency_key: key,
      operation_type: "authorize",
      charge_id: result.charge_id,
      amount: result.amount,
      status: finalStatus,
      event_type: result.event_type,
      event_date: result.event_date,
      response_payload: result.response_payload,
      created_at: now,
      updated_at: now,
    }
    CulqiIdempotencyStore.memoryStore.set(key, newRecord)
    return newRecord
  }

  /**
   * Completes an operation by session ID, matching either the session_id column
   * or standard keys (idem:sessionId, session:sessionId).
   */
  async completeBySessionId(
    sessionId: string,
    result: {
      charge_id?: string
      amount?: number
      status?: CulqiOperationStatus
      event_type?: string
      event_date?: number
      response_payload?: Record<string, unknown>
    }
  ): Promise<CulqiOperationRecord> {
    if (!sessionId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "sessionId is required for completeBySessionId")
    }
    this.assertPersistence()
    await this.ensureTable()
    const now = new Date()
    const finalStatus: CulqiOperationStatus = result.status || "completed"
    const canonicalKey = CulqiIdempotencyStore.sessionKey(sessionId)

    if (this.hasKnex()) {
      const existing = await this.knex("culqi_operations")
        .where({ session_id: sessionId })
        .orWhere({ idempotency_key: canonicalKey })
        .orWhere({ idempotency_key: `session:${sessionId}` })
        .orderBy("created_at", "desc")
        .first()

      if (existing) {
        const [updated] = await this.knex("culqi_operations")
          .where({ id: existing.id })
          .update({
            session_id: sessionId,
            charge_id: result.charge_id || existing.charge_id,
            amount: result.amount ?? existing.amount,
            status: finalStatus,
            event_type: result.event_type || existing.event_type,
            event_date: result.event_date ?? existing.event_date,
            response_payload: result.response_payload ? JSON.stringify(result.response_payload) : existing.response_payload,
            locked_at: null,
            updated_at: now,
          })
          .returning("*")
        return updated
      }

      const newRecord = {
        id: `culqi_op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        idempotency_key: canonicalKey,
        operation_type: "reconciliation",
        session_id: sessionId,
        charge_id: result.charge_id,
        amount: result.amount,
        currency_code: "PEN",
        status: finalStatus,
        event_type: result.event_type,
        event_date: result.event_date,
        response_payload: result.response_payload ? JSON.stringify(result.response_payload) : null,
        created_at: now,
        updated_at: now,
      }
      const [inserted] = await this.knex("culqi_operations").insert(newRecord).returning("*")
      return inserted
    }

    for (const record of CulqiIdempotencyStore.memoryStore.values()) {
      if (
        record.session_id === sessionId ||
        record.idempotency_key === canonicalKey ||
        record.idempotency_key === `session:${sessionId}`
      ) {
        record.session_id = sessionId
        record.charge_id = result.charge_id || record.charge_id
        record.amount = result.amount ?? record.amount
        record.status = finalStatus
        record.event_type = result.event_type || record.event_type
        record.event_date = result.event_date ?? record.event_date
        record.response_payload = result.response_payload || record.response_payload
        record.locked_at = undefined
        record.updated_at = now
        return record
      }
    }

    const newRecord: CulqiOperationRecord = {
      id: `culqi_op_mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      idempotency_key: canonicalKey,
      operation_type: "reconciliation",
      session_id: sessionId,
      charge_id: result.charge_id,
      amount: result.amount,
      currency_code: "PEN",
      status: finalStatus,
      event_type: result.event_type,
      event_date: result.event_date,
      response_payload: result.response_payload,
      created_at: now,
      updated_at: now,
    }
    CulqiIdempotencyStore.memoryStore.set(canonicalKey, newRecord)
    return newRecord
  }

  /**
   * Marks an operation as failed or uncertain.
   */
  async fail(
    key: string,
    errorMessage: string,
    options?: { uncertain?: boolean; charge_id?: string }
  ): Promise<CulqiOperationRecord> {
    this.assertPersistence()
    const now = new Date()
    const status: CulqiOperationStatus = options?.uncertain ? "uncertain" : "failed"

    if (this.hasKnex()) {
      const [updated] = await this.knex("culqi_operations")
        .where({ idempotency_key: key })
        .update({
          status,
          error_message: errorMessage,
          charge_id: options?.charge_id,
          locked_at: null,
          updated_at: now,
        })
        .returning("*")

      return updated
    }

    const existing = CulqiIdempotencyStore.memoryStore.get(key)
    if (existing) {
      existing.status = status
      existing.error_message = errorMessage
      existing.charge_id = options?.charge_id || existing.charge_id
      existing.locked_at = undefined
      existing.updated_at = now
      return existing
    }

    const newRecord: CulqiOperationRecord = {
      id: `culqi_op_${Date.now()}`,
      idempotency_key: key,
      operation_type: "authorize",
      status,
      error_message: errorMessage,
      charge_id: options?.charge_id,
      created_at: now,
      updated_at: now,
    }
    CulqiIdempotencyStore.memoryStore.set(key, newRecord)
    return newRecord
  }

  /**
   * Retrieves an operation record by session ID.
   */
  async getBySessionId(sessionId: string): Promise<CulqiOperationRecord | null> {
    if (!sessionId) return null
    this.assertPersistence()
    await this.ensureTable()

    if (this.hasKnex()) {
      const record = await this.knex("culqi_operations")
        .where({ session_id: sessionId })
        .orderBy("created_at", "desc")
        .first()
      return record || null
    }

    for (const record of CulqiIdempotencyStore.memoryStore.values()) {
      if (record.session_id === sessionId) {
        return record
      }
    }
    return null
  }

  /**
   * Retrieves an operation record by charge ID.
   */
  async getByChargeId(chargeId: string): Promise<CulqiOperationRecord | null> {
    if (!chargeId) return null
    this.assertPersistence()
    await this.ensureTable()

    if (this.hasKnex()) {
      const record = await this.knex("culqi_operations")
        .where({ charge_id: chargeId })
        .orderBy("created_at", "desc")
        .first()
      return record || null
    }

    for (const record of CulqiIdempotencyStore.memoryStore.values()) {
      if (record.charge_id === chargeId) {
        return record
      }
    }
    return null
  }

  /**
   * Retrieves an operation record by exact idempotency key.
   */
  async getByKey(key: string): Promise<CulqiOperationRecord | null> {
    if (!key) return null
    this.assertPersistence()
    await this.ensureTable()

    if (this.hasKnex()) {
      const record = await this.knex("culqi_operations")
        .where({ idempotency_key: key })
        .first()
      return record || null
    }

    return CulqiIdempotencyStore.memoryStore.get(key) || null
  }

  /**
   * Clear in-memory entries (for test isolation).
   */
  clearMemory(): void {
    CulqiIdempotencyStore.memoryStore.clear()
  }

  static clearMemory(): void {
    CulqiIdempotencyStore.memoryStore.clear()
  }
}

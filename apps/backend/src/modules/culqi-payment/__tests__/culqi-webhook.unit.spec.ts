import { POST } from "../../../api/store/culqi/webhook/route"
import { CulqiClient } from "../client"

jest.mock("../client")

describe("Culqi Store Webhook Endpoint Unit Tests", () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }

  const mockQuery = {
    graph: jest.fn(),
  }

  const createMockReq = (body: any, headers: Record<string, string> = {}) =>
    ({
      body,
      headers,
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === "logger") return mockLogger
          if (key === "query") return mockQuery
          return {}
        }),
      },
    }) as any

  const createMockRes = () => {
    const res: any = {}
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    return res
  }

  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.CULQI_SECRET_KEY = "sk_test_mock_secret_key"
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("should reject unauthorized requests when CULQI_WEBHOOK_SECRET is configured and token is invalid", async () => {
    process.env.CULQI_WEBHOOK_SECRET = "super_secret_webhook_token"

    const req = createMockReq(
      { type: "charge.succeeded", data: { id: "chr_123" } },
      { authorization: "Bearer wrong_token" }
    )
    const res = createMockRes()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Unauthorized",
      })
    )
  })

  it("should accept request when CULQI_WEBHOOK_SECRET matches", async () => {
    process.env.CULQI_WEBHOOK_SECRET = "super_secret_webhook_token"

    const mockGetCharge = jest.fn().mockResolvedValueOnce({
      id: "chr_test_valid_123",
      amount: 5000,
      currency_code: "PEN",
      capture: true,
      metadata: { session_id: "sess_123" },
    })
    ;(CulqiClient as jest.Mock).mockImplementation(() => ({
      getCharge: mockGetCharge,
    }))

    mockQuery.graph.mockResolvedValueOnce({ data: [{ id: "sess_123", status: "pending" }] })

    const req = createMockReq(
      { type: "charge.succeeded", data: { id: "chr_test_valid_123" } },
      { authorization: "Bearer super_secret_webhook_token" }
    )
    const res = createMockRes()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        received: true,
        charge_id: "chr_test_valid_123",
        verified: true,
      })
    )
    expect(mockGetCharge).toHaveBeenCalledWith("chr_test_valid_123")
  })

  it("should return 503 if CULQI_SECRET_KEY is missing on server", async () => {
    delete process.env.CULQI_SECRET_KEY

    const req = createMockReq({ type: "charge.succeeded", data: { id: "chr_123" } })
    const res = createMockRes()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Service Unavailable",
      })
    )
  })

  it("should respond idempotently with already_captured when session is already captured", async () => {
    const mockGetCharge = jest.fn().mockResolvedValueOnce({
      id: "chr_test_already_done",
      amount: 4000,
      currency_code: "PEN",
      capture: true,
      metadata: { session_id: "sess_captured_previously" },
    })
    ;(CulqiClient as jest.Mock).mockImplementation(() => ({
      getCharge: mockGetCharge,
    }))

    mockQuery.graph.mockResolvedValueOnce({
      data: [{ id: "sess_captured_previously", status: "captured" }],
    })

    const req = createMockReq({
      type: "charge.succeeded",
      data: { id: "chr_test_already_done" },
    })
    const res = createMockRes()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        received: true,
        status: "already_captured",
      })
    )
  })

  it("should acknowledge cleanly when event has no target charge ID", async () => {
    const req = createMockReq({ type: "ping.event", data: {} })
    const res = createMockRes()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        received: true,
        status: "ignored_no_target_id",
      })
    )
  })
})

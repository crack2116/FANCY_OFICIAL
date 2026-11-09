import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fs from "fs"
import path from "path"

/**
 * `GET /panel`
 *
 * Sirve el panel administrativo propio (HTML estático) desde el mismo origen
 * que la API de Medusa. El panel se autentica contra `/auth/user/emailpass` y
 * consume `/admin/*` con el JWT resultante, por lo que no necesita CORS.
 *
 * En desarrollo `process.cwd()` es `apps/backend`; en producción es
 * `apps/backend/.medusa/server`. Por eso se prueban ambas ubicaciones.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const candidates = [
    path.join(process.cwd(), "public", "panel", "index.html"),
    path.join(process.cwd(), "..", "..", "public", "panel", "index.html"),
  ]

  const file = candidates.find((candidate) => fs.existsSync(candidate))
  if (!file) {
    res.status(404).type("text/plain").send("Panel no encontrado.")
    return
  }

  res.type("html").send(fs.readFileSync(file, "utf8"))
}

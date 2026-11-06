const { mkdir, readFile } = require("node:fs/promises")
const { resolve } = require("node:path")

const sharpModulePath = process.argv[2]
if (!sharpModulePath) {
  throw new Error("Usage: node scripts/generate-admin-pwa-icons.cjs <sharp-module-path>")
}
const sharp = require(sharpModulePath)
const adminRoot = resolve(__dirname, "../src/admin")
const targets = [
  ["icon-192-v1.png", 192],
  ["icon-512-v1.png", 512],
  ["icon-maskable-512-v1.png", 512],
  ["apple-touch-icon-v1.png", 180],
]

const generate = async () => {
  const svg = await readFile(resolve(adminRoot, "assets/pwa-icon.svg"))
  const iconsDir = resolve(adminRoot, "public/icons")
  await mkdir(iconsDir, { recursive: true })
  for (const [fileName, size] of targets) {
    await sharp(svg)
      .resize(size, size)
      .flatten({ background: "#0b1930" })
      .removeAlpha()
      .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
      .toFile(resolve(iconsDir, fileName))
    process.stdout.write(`${fileName}: ${size}x${size}\n`)
  }
}

generate().catch((error) => {
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
})

#!/usr/bin/env node
/**
 * Generates deploy/dokploy/docker-compose.images.yml from the canonical
 * docker-compose.dokploy.yml by removing every `build:` block.
 *
 * Use this variant only with Dokploy's "Raw" compose source after the images
 * have been built on the host:
 *   fancyperu-backend:dokploy
 *   fancyperu-storefront:dokploy
 *
 * The canonical file remains docker-compose.dokploy.yml (Git source, build
 * supported). Do not edit the generated file by hand.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const source = join(here, "..", "..", "docker-compose.dokploy.yml")
const target = join(here, "docker-compose.images.yml")

const lines = readFileSync(source, "utf8").split(/\r?\n/)
const output = []
let skippingBuild = false

for (const line of lines) {
  if (/^ {4}build:\s*$/.test(line)) {
    skippingBuild = true
    continue
  }

  if (skippingBuild) {
    // A build block is a 4-space `build:` key followed by 6+ space children.
    // The block ends at the next key indented 4 spaces or less.
    if (/^ {6,}\S/.test(line) || /^ {6,}$/.test(line)) {
      continue
    }
    skippingBuild = false
  }

  output.push(line)
}

const header = [
  "# ==============================================================================",
  "# GENERATED FILE - do not edit by hand.",
  "# Source: docker-compose.dokploy.yml",
  "# Regenerate: node deploy/dokploy/render-images-compose.mjs",
  "#",
  "# Use with Dokploy sourceType=raw after building the images on the host:",
  "#   fancyperu-backend:dokploy",
  "#   fancyperu-storefront:dokploy",
  "# ==============================================================================",
  "",
]

writeFileSync(target, header.join("\n") + output.join("\n"), "utf8")
console.log(`wrote ${target}`)

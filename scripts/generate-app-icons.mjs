#!/usr/bin/env node
/**
 * Renders the app icons from Otto's head (public/mascot/otto-face.svg, drawn by `npm run mascot:draw`), tilted like
 * the logo, into public/icons/:
 *   otto-192.png, otto-512.png   — transparent, for the browser tab, the installed app and push notifications
 *   otto-maskable-512.png        — on the paper colour with room round him, for Android's masked icons
 *   otto-apple-180.png           — on the paper colour, for iOS (which fills transparent pixels with black)
 * Usage: npm run icons:draw   (after `npm run mascot:draw` changes his face)
 */
import { mkdirSync, readFileSync } from 'fs'
import { resolve } from 'path'
import sharp from 'sharp'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, 'public', 'icons')
mkdirSync(OUT, { recursive: true })

const TILT_DEG = -10 // OTTO_FACE_TILT_DEG in src/lib/constants/mascot.ts
const PAPER = '#F7F8F6'
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 }

const face = readFileSync(resolve(ROOT, 'public', 'mascot', 'otto-face.svg'))
const tilted = await sharp(face, { density: 600 })
  .resize(900, 900)
  .rotate(TILT_DEG, { background: CLEAR })
  .png()
  .toBuffer()

/** His tilted head at `share` of a `size` square, centred, on `background`. */
async function icon(size, share, background, file) {
  const inner = Math.round(size * share)
  const head = await sharp(tilted).resize(inner, inner, { fit: 'contain', background: CLEAR }).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: head, gravity: 'center' }])
    .png()
    .toFile(resolve(OUT, file))
  console.log(file)
}

await icon(192, 1, CLEAR, 'otto-192.png')
await icon(512, 1, CLEAR, 'otto-512.png')
await icon(512, 0.68, PAPER, 'otto-maskable-512.png')
await icon(180, 0.86, PAPER, 'otto-apple-180.png')

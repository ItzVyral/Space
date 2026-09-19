#!/usr/bin/env node
/**
 * Génère les assets de l'installeur DMG macOS — zéro dépendance, Node pur.
 *
 * Pourquoi ce script : electron-builder exige un fond PNG et une icône .icns
 * dans `buildResources`. On dessine ces assets de façon procédurale et
 * déterministe (PRNG seedée) plutôt que d'ajouter une librairie native
 * (AGENTS §7) : PNG encodé à la main (zlib + CRC32), .icns = conteneur de
 * chunks PNG (format accepté par macOS 10.7+).
 *
 * Sorties :
 *   build/dmg-background.png — feuille de cahier lignée + flèche à la main +
 *     guides pointillés vers Applications.
 *   build/icon.icns + build/icon.png — icône « esquisse Space » (dégradé
 *     accent → violet + courbe Bezier blanche).
 *
 * Centres d'icônes dessinés sur le fond — constantes liées à la clé
 * `dmg.contents` de electron-builder.yml (ne pas désynchroniser) :
 *   app         → (165, 205)
 *   Applications → (335, 205)
 * Les libellés « Space » / « Applications » sous les icônes sont posés par
 * electron-builder (`iconTextSize`) : aucun texte n'est dessiné sur le fond.
 */

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'build')

const BG_W = 500
const BG_H = 400
const BG_SCALE = 2

const APP_CENTER = { x: 165, y: 205 }
const APPLICATIONS_CENTER = { x: 335, y: 205 }
const ARROW_FROM = 200
const ARROW_TO = 302

const SEED = 20260919

const ACCENT = { r: 13, g: 153, b: 255 } // #0d99ff
const ACCENT_2 = { r: 124, g: 58, b: 237 } // #7c3aed
const LINE_BLUE = { r: 92, g: 112, b: 164 }
const MARGIN_RED = { r: 208, g: 78, b: 78 }

// PRNG déterministe (mulberry32) : rendu reproductible sur toutes les OS.
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Surface RGBA avec compositing source-over.
class Surface {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.data = new Uint8ClampedArray(w * h * 4)
  }

  pixelAt(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null
    return this.data.subarray((y * this.w + x) * 4, (y * this.w + x) * 4 + 4)
  }

  set(x, y, c) {
    const i = (y * this.w + x) * 4
    this.data[i] = c.r
    this.data[i + 1] = c.g
    this.data[i + 2] = c.b
    this.data[i + 3] = c.a
  }

  compose(x, y, c) {
    const p = this.pixelAt(x, y)
    if (!p) return
    const sa = c.a / 255
    if (sa <= 0) return
    const da = p[3] / 255
    const oa = sa + da * (1 - sa)
    if (oa <= 0) return
    p[0] = (c.r * sa + p[0] * da * (1 - sa)) / oa
    p[1] = (c.g * sa + p[1] * da * (1 - sa)) / oa
    p[2] = (c.b * sa + p[2] * da * (1 - sa)) / oa
    p[3] = oa * 255
  }

  fillRect(x0, y0, w, h, c) {
    for (let y = Math.max(0, y0); y < Math.min(this.h, y0 + h); y++) {
      for (let x = Math.max(0, x0); x < Math.min(this.w, x0 + w); x++) {
        this.compose(x, y, c)
      }
    }
  }

  fillDisc(cx, cy, r, c) {
    const minX = Math.max(0, Math.floor(cx - r - 1))
    const maxX = Math.min(this.w - 1, Math.ceil(cx + r + 1))
    const minY = Math.max(0, Math.floor(cy - r - 1))
    const maxY = Math.min(this.h - 1, Math.ceil(cy + r + 1))
    const r2 = r * r
    for (let y = minY; y <= maxY; y++) {
      const dy = y - cy
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx
        if (dx * dx + dy * dy <= r2) this.compose(x, y, c)
      }
    }
  }
}

// Encodage PNG (RGBA 8 bit) : CRC32 table-driven, chunks IHDR/IDAT/IEND.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}

function encodePng(w, h, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = w * 4
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0 // filtre None par ligne
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

// Downscale 2× en espace prémultiplié : l'alpha moyen évite les bords sombres
// parasites sur les bords anti-aliasés.
function boxDownsample(src, sw, sh) {
  const dw = sw >> 1
  const dh = sh >> 1
  const out = new Uint8ClampedArray(dw * dh * 4)
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      let pr = 0
      let pg = 0
      let pb = 0
      let pa = 0
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const i = ((y * 2 + dy) * sw + (x * 2 + dx)) * 4
          const a = src[i + 3]
          pr += src[i] * a
          pg += src[i + 1] * a
          pb += src[i + 2] * a
          pa += a
        }
      }
      const j = (y * dw + x) * 4
      const a = pa / 4
      if (a > 0.5) {
        out[j] = pr / 4 / a
        out[j + 1] = pg / 4 / a
        out[j + 2] = pb / 4 / a
        out[j + 3] = a
      }
    }
  }
  return { data: out, w: dw, h: dh }
}

function chainDownsample(src, w, h, times) {
  let cur = { data: src, w, h }
  for (let i = 0; i < times; i++) cur = boxDownsample(cur.data, cur.w, cur.h)
  return cur
}

// Traits et courbes.
function strokePolyline(s, pts, width, c) {
  const r = width / 2
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const seg = Math.hypot(b.x - a.x, b.y - a.y)
    const steps = Math.max(1, Math.ceil(seg))
    for (let k = 0; k <= steps; k++) {
      const t = k / steps
      s.fillDisc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, r, c)
    }
  }
}

// Décalage perpendiculaire pseudo-périodique → tracé à main levée.
function wobbly(points, amplitude, freq, phase = 0) {
  const out = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const t = i / (points.length - 1)
    const next = points[Math.min(i + 1, points.length - 1)]
    const prev = points[Math.max(i - 1, 0)]
    const dx = next.x - prev.x
    const dy = next.y - prev.y
    const len = Math.hypot(dx, dy) || 1
    const off = Math.sin(t * freq * Math.PI * 2 + phase) * amplitude * (0.4 + 0.6 * t)
    out.push({ x: p.x + (-dy / len) * off, y: p.y + (dx / len) * off })
  }
  return out
}

function cubicBezier(p0, p1, p2, p3, n) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const mt = 1 - t
    pts.push({
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
    })
  }
  return pts
}

function circlePolyline(cx, cy, r, steps = 200) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return pts
}

// Rectangle arrondi couvert par une polyligne dense (arcs échantillonnés).
function roundedRectPolyline(cx, cy, hw, hh, r, arcSteps = 16) {
  const rw = Math.max(0, hw - r)
  const rh = Math.max(0, hh - r)
  const pts = []
  const arc = (ccX, ccY, a0, a1) => {
    for (let i = 0; i <= arcSteps; i++) {
      const a = a0 + ((a1 - a0) * i) / arcSteps
      pts.push({ x: ccX + r * Math.cos(a), y: ccY + r * Math.sin(a) })
    }
  }
  pts.push({ x: cx - rw, y: cy - hh })
  pts.push({ x: cx + rw, y: cy - hh })
  arc(cx + rw, cy - rh, -Math.PI / 2, 0)
  pts.push({ x: cx + hw, y: cy + rh })
  arc(cx + rw, cy + rh, 0, Math.PI / 2)
  pts.push({ x: cx - rw, y: cy + hh })
  arc(cx - rw, cy + rh, Math.PI / 2, Math.PI)
  pts.push({ x: cx - hw, y: cy - rh })
  arc(cx - rw, cy - rh, Math.PI, (3 * Math.PI) / 2)
  return pts
}

// Pointillés le long d'une polyligne, par avancée à longueur d'arc.
function dashedStroke(s, pts, width, c, dash = 26, gap = 18) {
  const out = []
  let stretch = 0
  let drawing = true
  let prev = null
  for (const p of pts) {
    if (prev) {
      stretch += Math.hypot(p.x - prev.x, p.y - prev.y)
      if (drawing && stretch >= dash) {
        drawing = false
        stretch = 0
      } else if (!drawing && stretch >= gap) {
        drawing = true
        stretch = 0
      }
      if (drawing) out.push(p)
    }
    prev = p
  }
  strokePolyline(s, out, width, c)
}

// Fond : feuille de cahier lignée 500×400, rendue en supersampling ×2.
function renderBackground() {
  const w = BG_W * BG_SCALE
  const h = BG_H * BG_SCALE
  const s = new Surface(w, h)
  const rand = mulberry32(SEED)

  s.fillRect(0, 0, w, h, { r: 248, g: 247, b: 242, a: 255 })

  const lineColor = { r: LINE_BLUE.r, g: LINE_BLUE.g, b: LINE_BLUE.b, a: 28 }
  for (let y = 0; y < h; y += 48) s.fillRect(0, y, w, 2, lineColor)
  s.fillRect(56 * BG_SCALE, 0, 2, h, { r: MARGIN_RED.r, g: MARGIN_RED.g, b: MARGIN_RED.b, a: 34 })

  // Coin replié en haut à droite, avec le tracé du pli.
  const fold = 30 * BG_SCALE
  s.fillRect(w - fold, 0, fold, fold, { r: 0, g: 0, b: 0, a: 10 })
  strokePolyline(s, [
    { x: w - fold, y: 0 },
    { x: w - fold, y: fold },
    { x: w, y: 0 }
  ], 2, { r: 0, g: 0, b: 0, a: 22 })

  const ax = APP_CENTER.x * BG_SCALE
  const ay = APP_CENTER.y * BG_SCALE
  const bx = APPLICATIONS_CENTER.x * BG_SCALE
  const by = APPLICATIONS_CENTER.y * BG_SCALE

  // Guide app : cercle pointillé accent + second passage léger (stylo superposé).
  const appCircle = circlePolyline(ax, ay, 50 * BG_SCALE)
  dashedStroke(s, appCircle, 7 * BG_SCALE, { r: ACCENT.r, g: ACCENT.g, b: ACCENT.b, a: 150 }, 26 * BG_SCALE, 18 * BG_SCALE)
  strokePolyline(s, wobbly(appCircle, 6, 5), 5 * BG_SCALE, { r: ACCENT.r, g: ACCENT.g, b: ACCENT.b, a: 60 })

  // Guide Applications : rectangle arrondi pointillé violet.
  const rr = roundedRectPolyline(bx, by, 45 * BG_SCALE, 41 * BG_SCALE, 18 * BG_SCALE)
  dashedStroke(s, rr, 7 * BG_SCALE, { r: ACCENT_2.r, g: ACCENT_2.g, b: ACCENT_2.b, a: 130 }, 26 * BG_SCALE, 18 * BG_SCALE)
  strokePolyline(s, wobbly(rr, 5, 4), 4 * BG_SCALE, { r: ACCENT_2.r, g: ACCENT_2.g, b: ACCENT_2.b, a: 55 })

  // Flèche à la main de l'app vers Applications.
  const p0 = { x: ARROW_FROM * BG_SCALE, y: ay }
  const p3 = { x: ARROW_TO * BG_SCALE, y: ay }
  const arrow = wobbly(
    cubicBezier(p0, { x: p0.x + 20 * BG_SCALE, y: ay - 14 * BG_SCALE }, { x: p3.x - 20 * BG_SCALE, y: ay + 10 * BG_SCALE }, p3, 40),
    2.5 * BG_SCALE,
    3,
    0.5
  )
  strokePolyline(s, arrow, 9 * BG_SCALE, { r: ACCENT.r, g: ACCENT.g, b: ACCENT.b, a: 235 })
  strokePolyline(s, wobbly(arrow, 7, 2, 4), 6 * BG_SCALE, { r: ACCENT.r, g: ACCENT.g, b: ACCENT.b, a: 90 })
  strokePolyline(s, wobbly(arrow, 4, 2, 0.9), 2.5 * BG_SCALE, { r: ACCENT_2.r, g: ACCENT_2.g, b: ACCENT_2.b, a: 80 })

  // Tête de flèche : deux petits traits en V tracés à la main.
  const head = arrow[arrow.length - 1]
  const tail = arrow[arrow.length - 3]
  const dx = head.x - tail.x
  const dy = head.y - tail.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const hlen = 11 * BG_SCALE
  const wing = 6 * BG_SCALE
  const wingUp = { x: head.x - ux * hlen - uy * wing, y: head.y - uy * hlen + ux * wing }
  const wingDown = { x: head.x - ux * hlen + uy * wing, y: head.y - uy * hlen - ux * wing }
  strokePolyline(s, wobbly([tail, wingUp], 4, 3, 2), 9 * BG_SCALE, { r: ACCENT.r, g: ACCENT.g, b: ACCENT.b, a: 235 })
  strokePolyline(s, wobbly([tail, wingDown], 4, 3, 0.7), 9 * BG_SCALE, { r: ACCENT.r, g: ACCENT.g, b: ACCENT.b, a: 235 })

  const native = boxDownsample(s.data, s.w, s.h)
  const out = native.data
  const nw = native.w
  const nh = native.h
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const i = (y * nw + x) * 4
      out[i] += (rand() - 0.5) * 7 // grain papier très léger
      out[i + 1] += (rand() - 0.5) * 7
      out[i + 2] += (rand() - 0.5) * 7
      const d = Math.hypot(x / nw - 0.5, y / nh - 0.5) * 2
      const f = 1 - Math.max(0, d - 0.55) * 0.09
      out[i] *= f
      out[i + 1] *= f
      out[i + 2] *= f
    }
  }
  return { data: out, w: nw, h: nh }
}

// Icône « esquisse Space » : dégradé accent → violet, courbe Bezier blanche
// à la main et poignée de point d'ancrage. Rendu en supersampling ×2.
function renderIcon(px) {
  const w = px * 2
  const s = new Surface(w, w)
  const half = w / 2
  const radius = 0.225 * w
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const cx = Math.max(Math.abs(x - half) - (half - radius), 0)
      const cy = Math.max(Math.abs(y - half) - (half - radius), 0)
      if (Math.hypot(cx, cy) > radius) continue
      const t = (x + y) / (2 * w)
      s.set(x, y, {
        r: ACCENT.r + (ACCENT_2.r - ACCENT.r) * t,
        g: ACCENT.g + (ACCENT_2.g - ACCENT.g) * t,
        b: ACCENT.b + (ACCENT_2.b - ACCENT.b) * t,
        a: 255
      })
    }
  }

  const inset = 26 * 2
  const borderR = radius - inset
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const cx = Math.max(Math.abs(x - half) - (half - borderR), 0)
      const cy = Math.max(Math.abs(y - half) - (half - borderR), 0)
      const d = Math.hypot(cx, cy)
      if (d > borderR - 6 && d < borderR) s.compose(x, y, { r: 255, g: 255, b: 255, a: 26 })
    }
  }

  const p0 = { x: 0.3 * w, y: 0.7 * w }
  const p1 = { x: 0.46 * w, y: 0.54 * w }
  const p2 = { x: 0.52 * w, y: 0.34 * w }
  const p3 = { x: 0.72 * w, y: 0.3 * w }
  const curve = wobbly(cubicBezier(p0, p1, p2, p3, 60), 8, 1, 0.3)
  strokePolyline(s, curve, 0.085 * w, { r: 255, g: 255, b: 255, a: 245 })
  strokePolyline(s, wobbly(curve, 12, 1, 2), 0.05 * w, { r: 255, g: 255, b: 255, a: 60 })
  const handle = { x: 0.84 * w, y: 0.17 * w }
  strokePolyline(s, wobbly([p3, handle], 12, 2, 1), 0.045 * w, { r: 255, g: 255, b: 255, a: 160 })
  s.fillDisc(p3.x, p3.y, 0.032 * w, { r: 255, g: 255, b: 255, a: 240 })

  return chainDownsample(s.data, w, w, 1)
}

// Écriture des fichiers.
function writePng(file, w, h, rgba) {
  const buf = encodePng(w, h, rgba)
  writeFileSync(file, buf)
  return buf
}

function buildIcns(sizes) {
  const chunks = []
  for (const [type, buf] of sizes) {
    const len = 8 + buf.length
    const header = Buffer.alloc(8)
    header.write(type, 0, 4, 'ascii')
    header.writeUInt32BE(len, 4)
    chunks.push(Buffer.concat([header, buf]))
  }
  const total = 8 + chunks.reduce((sum, c) => sum + c.length, 0)
  const head = Buffer.alloc(8)
  head.write('icns', 0, 4, 'ascii')
  head.writeUInt32BE(total, 4)
  return Buffer.concat([head, ...chunks])
}

// Auto-vérification des sorties (signatures + dimensions).
function checkPng(file, w, h) {
  const buf = readFileSync(file)
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (!sig.equals(buf.subarray(0, 8))) throw new Error(`${file} : signature PNG invalide`)
  if (buf.readUInt32BE(16) !== w || buf.readUInt32BE(20) !== h) {
    throw new Error(`${file} : dimensions ${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)} (attendu ${w}x${h})`)
  }
}

function checkIcns(file) {
  const buf = readFileSync(file)
  if (buf.toString('ascii', 0, 4) !== 'icns') throw new Error(`${file} : magic icns manquant`)
  if (buf.readUInt32BE(4) !== buf.length) throw new Error(`${file} : taille totale incohérente`)
  if (!buf.includes(Buffer.from('ic10'))) throw new Error(`${file} : chunk 1024px manquant`)
}

mkdirSync(OUT_DIR, { recursive: true })

const bg = renderBackground()
writePng(join(OUT_DIR, 'dmg-background.png'), bg.w, bg.h, bg.data)
checkPng(join(OUT_DIR, 'dmg-background.png'), BG_W, BG_H)

const icon1024 = renderIcon(1024)
const icon512 = chainDownsample(icon1024.data, icon1024.w, icon1024.h, 1)
const icon256 = chainDownsample(icon512.data, icon512.w, icon512.h, 1)
const icon128 = chainDownsample(icon256.data, icon256.w, icon256.h, 1)
const icon32 = chainDownsample(icon128.data, icon128.w, icon128.h, 2)
const icon16 = chainDownsample(icon32.data, icon32.w, icon32.h, 1)

const icns = buildIcns([
  ['icp4', writePng(join(OUT_DIR, 'icon-16.png'), 16, 16, icon16.data)],
  ['icp5', writePng(join(OUT_DIR, 'icon-32.png'), 32, 32, icon32.data)],
  ['ic07', writePng(join(OUT_DIR, 'icon-128.png'), 128, 128, icon128.data)],
  ['ic08', writePng(join(OUT_DIR, 'icon-256.png'), 256, 256, icon256.data)],
  ['ic09', writePng(join(OUT_DIR, 'icon-512.png'), 512, 512, icon512.data)],
  ['ic10', writePng(join(OUT_DIR, 'icon-1024.png'), 1024, 1024, icon1024.data)]
])
writeFileSync(join(OUT_DIR, 'icon.icns'), icns)
checkIcns(join(OUT_DIR, 'icon.icns'))
writePng(join(OUT_DIR, 'icon.png'), 512, 512, icon512.data)
checkPng(join(OUT_DIR, 'icon.png'), 512, 512)

console.log(`assets DMG générés dans build/ :
  dmg-background.png (${bg.w}x${bg.h})
  icon.icns (16→1024px) + icon.png (512px)
`)
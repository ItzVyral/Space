#!/usr/bin/env node
/**
 * Génère les assets de l'installeur DMG macOS — zéro dépendance, Node pur.
 *
 * Sorties :
 *   build/dmg-background.png — rasterisation 500×400 de build/dmg-background.svg
 *     (feuille de cahier, cercle bleu, carré violet et flèche tracés à la main).
 *   build/icon.icns + build/icon.png — icône « esquisse Space » (dégradé
 *     accent → violet + courbe Bezier blanche).
 *
 * Pourquoi un rasteriseur maison : aucune dépendance native à ajouter (AGENTS
 * §7) pour un asset de build généré de façon déterministe. Le SVG source est la
 * référence ; ce script implémente le sous-ensemble utilisé (rect/line/path,
 * dégradés radial et linéaire, pattern) via un PNG encodé à la main (zlib +
 * CRC32) et un .icns écrit comme un conteneur de chunks PNG (format accepté
 * par macOS 10.7+).
 *
 * Centres d'icônes posés par electron-builder — constantes liées à la clé
 * `dmg.contents` de electron-builder.yml (ne pas désynchroniser) :
 *   app         → (167, 203)
 *   Applications → (338, 205)
 * Les libellés « Space » / « Applications » sous les icônes sont posés par
 * electron-builder (`iconTextSize`) : aucun texte n'est dessiné sur le fond.
 */

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'build')
const SVG_SRC = join(OUT_DIR, 'dmg-background.svg')

const BG_W = 500
const BG_H = 400
const BG_SCALE = 2

const ACCENT = { r: 13, g: 153, b: 255 } // #0d99ff
const ACCENT_2 = { r: 124, g: 58, b: 237 } // #7c3aed

/* ------------------------------------------------------------------ *
 * Surface RGBA avec compositing source-over.
 * ------------------------------------------------------------------ */
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
    if (!p || c.a <= 0) return
    const sa = c.a / 255
    const da = p[3] / 255
    const oa = sa + da * (1 - sa)
    if (oa <= 0) return
    p[0] = (c.r * sa + p[0] * da * (1 - sa)) / oa
    p[1] = (c.g * sa + p[1] * da * (1 - sa)) / oa
    p[2] = (c.b * sa + p[2] * da * (1 - sa)) / oa
    p[3] = oa * 255
  }

  fillRect(x0, y0, w, h, colorOrFn) {
    for (let y = Math.max(0, y0); y < Math.min(this.h, y0 + h); y++) {
      for (let x = Math.max(0, x0); x < Math.min(this.w, x0 + w); x++) {
        this.compose(x, y, typeof colorOrFn === 'function' ? colorOrFn(x, y) : colorOrFn)
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

  fillPolygon(pts, colorOrFn) {
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const minX = Math.max(0, Math.floor(Math.min(...xs) - 1))
    const maxX = Math.min(this.w - 1, Math.ceil(Math.max(...xs) + 1))
    const minY = Math.max(0, Math.floor(Math.min(...ys) - 1))
    const maxY = Math.min(this.h - 1, Math.ceil(Math.max(...ys) + 1))
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (pointInPolygon(x, y, pts)) {
          this.compose(x, y, typeof colorOrFn === 'function' ? colorOrFn(x, y) : colorOrFn)
        }
      }
    }
  }
}

// Ray casting : (x, y) à l'intérieur du polygone ?
function pointInPolygon(x, y, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]
    const b = pts[j]
    const crosses = a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    if (crosses) inside = !inside
  }
  return inside
}

/* ------------------------------------------------------------------ *
 * Encodage PNG (RGBA 8 bit) : CRC32 table-driven, chunks IHDR/IDAT/IEND.
 * ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ *
 * Couleurs, dégradés, traits.
 * ------------------------------------------------------------------ */
function hexColor(hex, opacity) {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) throw new Error(`couleur inconnue : ${hex}`)
  return {
    r: parseInt(m[1].slice(0, 2), 16),
    g: parseInt(m[1].slice(2, 4), 16),
    b: parseInt(m[1].slice(4, 6), 16),
    a: Math.round(255 * (opacity ?? 1))
  }
}

function lerpColor(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a + (b.a - a.a) * t
  }
}

const clamp01 = (t) => Math.min(1, Math.max(0, t))

// Résout fill/stroke : couleur hexadécimale ou dégradé (url(#id)).
function resolvePaint(value, opacity, defs, bbox) {
  if (!value || value === 'none') return null
  const m = /^url\(#([\w.-]+)\)$/.exec(value.trim())
  if (m) {
    const g = defs[m[1]]
    if (!g) throw new Error(`définition inconnue : #${m[1]}`)
    return makeGradientFn(g, bbox, opacity)
  }
  return hexColor(value, opacity)
}

function makeGradientFn(g, bbox, opacity) {
  const stops = g.stops.map((s) => ({
    offset: Number(s.offset),
    color: hexColor(s['stop-color'], (s.opacity ?? 1) * (opacity ?? 1))
  }))
  const stopAt = (t) => {
    const ct = clamp01(t)
    if (ct <= stops[0].offset) return stops[0].color
    for (let i = 1; i < stops.length; i++) {
      if (ct <= stops[i].offset) {
        const lo = stops[i - 1]
        const hi = stops[i]
        return lerpColor(lo.color, hi.color, (ct - lo.offset) / (hi.offset - lo.offset || 1))
      }
    }
    return stops[stops.length - 1].color
  }
  if (g.kind === 'linear') {
    const to = (q, min, max) => (g.userSpace ? q : bbox[min] + q * bbox[max])
    const p0 = { x: to(Number(g.x1), 'x', 'w'), y: to(Number(g.y1), 'y', 'h') }
    const p1 = { x: to(Number(g.x2), 'x', 'w'), y: to(Number(g.y2), 'y', 'h') }
    const dx = p1.x - p0.x
    const dy = p1.y - p0.y
    const len2 = dx * dx + dy * dy || 1
    return (x, y) => stopAt(((x - p0.x) * dx + (y - p0.y) * dy) / len2)
  }
  const cx = bbox.x + Number(g.cx) * bbox.w
  const cy = bbox.y + Number(g.cy) * bbox.h
  const rx = Number(g.r) * (bbox.w || 1)
  const ry = Number(g.r) * (bbox.h || 1)
  return (x, y) => stopAt(Math.hypot((x - cx) / rx, (y - cy) / ry))
}

// Trait : sertissage de disques le long de la polyligne, arrondi aux extrémités
// et aux joints (équivalent stroke-linecap/linejoin round). Couleur dégradée OK.
function strokePolyline(s, pts, width, colorOrFn) {
  const r = width / 2
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const seg = Math.hypot(b.x - a.x, b.y - a.y)
    const steps = Math.max(1, Math.ceil(seg))
    for (let k = 0; k <= steps; k++) {
      const t = k / steps
      const px = a.x + (b.x - a.x) * t
      const py = a.y + (b.y - a.y) * t
      s.fillDisc(px, py, r, typeof colorOrFn === 'function' ? colorOrFn(px, py) : colorOrFn)
    }
  }
}

function cubicBezier(p0, c1, c2, p3, n) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const mt = 1 - t
    pts.push({
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * p3.y
    })
  }
  return pts
}

// Décalage perpendiculaire pseudo-périodique → tracé à main levée (icône).
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

/* ------------------------------------------------------------------ *
 * Parseur SVG minimal — sous-ensemble du fichier dmg-background.svg.
 * ------------------------------------------------------------------ */
function stripSvgDecorations(xml) {
  return xml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/g, '')
    .replace(/<\?xml[\s\S]*?\?>/g, '')
}

function parseXml(xml) {
  const root = { tag: '#root', attrs: {}, children: [], text: '' }
  const stack = [root]
  const tagRe = /<(\/)?([a-zA-Z][\w.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/)?>|<\/[a-zA-Z][\w.-]*>/g
  for (const m of xml.matchAll(tagRe)) {
    if (m[1] || m[0].startsWith('</')) {
      if (stack.length > 1) stack.pop()
      continue
    }
    const attrs = {}
    for (const am of m[3].matchAll(/([\w.:-]+)="([^"]*)"/g)) attrs[am[1]] = am[2]
    const node = { tag: m[2], attrs, children: [], text: '' }
    stack[stack.length - 1].children.push(node)
    if (!m[4]) stack.push(node)
  }
  return root
}

const SVG_CURVE_STEPS = 48

function parsePathData(d) {
  const tokens = (d.match(/([a-zA-Z])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi) || []).map((t) =>
    /^[a-zA-Z]$/.test(t) ? t : Number(t)
  )
  const subpaths = []
  let cur = []
  let i = 0
  let cmd = null
  let cx = 0
  let cy = 0
  const close = () => {
    if (cur.length) subpaths.push(cur)
    cur = []
  }
  while (i < tokens.length) {
    const t = tokens[i]
    if (typeof t === 'string') {
      cmd = t
      i++
      continue
    }
    if (cmd === 'M') {
      cx = t
      cy = tokens[i + 1]
      i += 2
      if (cur.length === 0) cur.push({ x: cx, y: cy })
      else {
        close()
        cur.push({ x: cx, y: cy })
      }
    } else if (cmd === 'L') {
      cx = t
      cy = tokens[i + 1]
      cur.push({ x: cx, y: cy })
      i += 2
    } else if (cmd === 'C') {
      const c1 = { x: t, y: tokens[i + 1] }
      const c2 = { x: tokens[i + 2], y: tokens[i + 3] }
      const end = { x: tokens[i + 4], y: tokens[i + 5] }
      cur.push(...cubicBezier({ x: cx, y: cy }, c1, c2, end, SVG_CURVE_STEPS).slice(1))
      cx = end.x
      cy = end.y
      i += 6
    } else if (cmd === 'Z') {
      close()
      i++
    } else {
      throw new Error(`commande SVG non supportée : ${cmd}`)
    }
  }
  close()
  return subpaths
}

function boundsOfPoints(pts) {
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys)
  }
}

function collectDefs(node, defs) {
  for (const child of node.children) {
    if (child.tag === 'defs' || child.tag === 'svg' || child.tag === 'g') {
      collectDefs(child, defs)
    } else if (child.tag === 'linearGradient' || child.tag === 'radialGradient') {
      defs[child.attrs.id] = {
        kind: child.tag === 'linearGradient' ? 'linear' : 'radial',
        userSpace: child.attrs.gradientUnits === 'userSpaceOnUse',
        x1: child.attrs.x1,
        y1: child.attrs.y1,
        x2: child.attrs.x2,
        y2: child.attrs.y2,
        cx: child.attrs.cx,
        cy: child.attrs.cy,
        r: child.attrs.r,
        stops: child.children.filter((c) => c.tag === 'stop').map((s) => s.attrs)
      }
    } else if (child.tag === 'pattern') {
      defs[child.attrs.id] = {
        kind: 'pattern',
        width: Number(child.attrs.width) || 500,
        height: Number(child.attrs.height) || 24,
        lines: child.children.filter((c) => c.tag === 'line').map((l) => l.attrs)
      }
    }
  }
}

function scaleLine(s, pts) {
  return pts.map((p) => ({ x: p.x * s.scale, y: p.y * s.scale }))
}

function renderNode(s, node, defs) {
  if (node.tag === '#root' || node.tag === 'svg' || node.tag === 'g') {
    for (const child of node.children) renderNode(s, child, defs)
    return
  }
  if (
    node.tag === 'defs' ||
    node.tag === 'linearGradient' ||
    node.tag === 'radialGradient' ||
    node.tag === 'pattern' ||
    node.tag === 'stop'
  ) {
    return
  }
  const a = node.attrs
  const opacity = a.opacity != null ? Number(a.opacity) : null
  if (node.tag === 'rect' || node.tag === 'line' || node.tag === 'path') {
    if (node.tag === 'rect') {
      const x = Number(a.x) || 0
      const y = Number(a.y) || 0
      const w = Number(a.width) || 0
      const h = Number(a.height) || 0
      const pattern = defsFromFill(defs, a.fill)
      if (pattern && pattern.kind === 'pattern') {
        renderPattern(s, { x, y, w, h }, pattern)
        return
      }
      const paint = resolvePaint(a.fill, opacity, defs, { x, y, w, h })
      if (paint === null) return
      s.fillRect(x * s.scale, y * s.scale, w * s.scale, h * s.scale, paintFn(s, paint))
      return
    }
    if (node.tag === 'line') {
      const p0 = { x: Number(a.x1), y: Number(a.y1) }
      const p1 = { x: Number(a.x2), y: Number(a.y2) }
      const bb = boundsOfPoints([p0, p1])
      const paint = resolvePaint(a.stroke, opacity, defs, bb)
      if (paint === null) return
      strokePolyline(s, scaleLine(s, [p0, p1]), (Number(a['stroke-width']) || 1) * s.scale, paintFn(s, paint))
      return
    }
    const subpaths = parsePathData(a.d)
    for (const pts of subpaths) {
      const scaled = scaleLine(s, pts)
      const bb = boundsOfPoints(pts)
      const fillPaint = resolvePaint(a.fill, opacity, defs, bb)
      if (fillPaint !== null) s.fillPolygon(scaled, paintFn(s, fillPaint))
      const strokePaint = resolvePaint(a.stroke, opacity, defs, bb)
      if (strokePaint !== null) {
        strokePolyline(s, scaled, (Number(a['stroke-width']) || 1) * s.scale, paintFn(s, strokePaint))
      }
    }
    return
  }
  throw new Error(`élément SVG non supporté : <${node.tag}>`)
}

function defsFromFill(defs, value) {
  if (!value) return null
  const m = /^url\(#([\w.-]+)\)$/.exec(value.trim())
  return m ? defs[m[1]] ?? null : null
}

// Remplissage pattern : répète les traits du pattern en tuiles sur le rect.
function renderPattern(s, rect, pattern) {
  const tw = pattern.width
  const th = pattern.height
  for (const line of pattern.lines) {
    const y = Number(line.y1) || 0
    const paint = resolvePaint(line.stroke, line.opacity, {}, { x: 0, y, w: 1, h: 1 })
    if (paint === null) continue
    const width = (Number(line['stroke-width']) || 1) * s.scale
    for (let oy = 0; rect.y + oy + y < rect.y + rect.h; oy += th) {
      const p0 = { x: rect.x, y: rect.y + oy + y }
      const p1 = { x: rect.x + rect.w, y: rect.y + oy + y }
      strokePolyline(s, scaleLine(s, [p0, p1]), width, paint)
    }
  }
}

// Les dégradés sont définis en coordonnées SVG ; les rendre en coordonnées de
// surface nécessite de diviser par l'échelle de supersampling.
function paintFn(s, paint) {
  if (typeof paint !== 'function') return paint
  return (x, y) => paint(x / s.scale, y / s.scale)
}

function renderBackground() {
  const s = new Surface(BG_W * BG_SCALE, BG_H * BG_SCALE)
  s.scale = BG_SCALE
  const xml = stripSvgDecorations(readFileSync(SVG_SRC, 'utf8'))
  const tree = parseXml(xml)
  const defs = {}
  collectDefs(tree, defs)
  renderNode(s, tree, defs)
  const native = boxDownsample(s.data, s.w, s.h)
  return { data: native.data, w: native.w, h: native.h }
}

/* ------------------------------------------------------------------ *
 * Icône « esquisse Space » : dégradé accent → violet, courbe Bezier blanche
 * à la main et poignée de point d'ancrage. Rendu en supersampling ×2.
 * ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ *
 * Écriture des fichiers + auto-vérification.
 * ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ *
 * Génération.
 * ------------------------------------------------------------------ */
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
  dmg-background.png (${bg.w}x${bg.h}) — depuis dmg-background.svg
  icon.icns (16→1024px) + icon.png (512px)
`)
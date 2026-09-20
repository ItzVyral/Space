/**
 * Détection de bornes (bounding boxes) sur le scene graph. Fonctions pures,
 * agnostiques du rendu ; utilisées par le hit-testing (pré-filtre par bbox)
 * et par l'ajustement de la viewport.
 *
 * Les bornes d'un chemin sont fournies par la boîte englobante des POINTS DE
 * CONTRÔLE transformés : c'est un conteneur conservateur de la courbe
 * (sûr pour filtrer les échecs, jamais de faux négatif). Pour les bords
 * axis-aligned c'est exact ; sous rotation seule la boîte la plus fine
 * nécessiterait une résolution dans l'espace transformé.
 */
import type { SceneGraph } from '../scene/SceneGraph'
import type { AnyNode, PathNode } from '../scene/SceneNode'
import { applyTransform, type Transform } from '../scene/Transform'
import type { Vec2 } from './vec'

export interface Bounds {
  x: number
  y: number
  w: number
  h: number
}

export function boundsFromPoints(points: readonly Vec2[]): Bounds | null {
  if (points.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/**
 * Bornes d'un nœud dans l'espace monde. Le `transform` du nœud est appliqué
 * aux points avant de borner. Retourne null pour les groupes, textes et
 * chemins vides (pas de géométrie propre).
 */
export function nodeBounds(node: AnyNode): Bounds | null {
  const t = node.transform
  if (node.type === 'group' || node.type === 'text') return null

  if (node.type === 'rect') {
    const hw = node.width / 2
    const hh = node.height / 2
    const center = applyTransform(t, hw, hh)
    const xExtent = Math.hypot(t.m00 * hw, t.m01 * hh)
    const yExtent = Math.hypot(t.m10 * hw, t.m11 * hh)
    return { x: center.x - xExtent, y: center.y - yExtent, w: xExtent * 2, h: yExtent * 2 }
  }

  if (node.type === 'ellipse') {
    // Bornes exactes d'une ellipse affine : l'extrême selon un axe est la
    // norme du semi-axe transformé, atteinte sur l'axe propre de l'ellipse.
    const hw = node.width / 2
    const hh = node.height / 2
    const center = applyTransform(t, hw, hh)
    const xExtent = Math.hypot(t.m00 * hw, t.m01 * hh)
    const yExtent = Math.hypot(t.m10 * hw, t.m11 * hh)
    return { x: center.x - xExtent, y: center.y - yExtent, w: xExtent * 2, h: yExtent * 2 }
  }

  const points = pathControlPoints(node, t)
  return boundsFromPoints(points)
}

/** Tous les points (positions + contrôles Bézier) d'un chemin, transformés. */
function pathControlPoints(node: PathNode, t: Transform): Vec2[] {
  const out: Vec2[] = []
  const anchors = node.points
  if (anchors.length === 0) return out
  for (const anchor of anchors) out.push(applyTransform(t, anchor.position.x, anchor.position.y))
  for (let i = 0; i < anchors.length; i++) {
    const from = anchors[i]!
    const to = anchors[(i + 1) % anchors.length]!
    if (!node.closed && i === anchors.length - 1) break
    if (to.handleIn) out.push(applyTransform(t, to.handleIn.x, to.handleIn.y))
    if (from.handleOut) out.push(applyTransform(t, from.handleOut.x, from.handleOut.y))
  }
  return out
}

export function mergeBounds(a: Bounds, b: Bounds): Bounds {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const right = Math.max(a.x + a.w, b.x + b.w)
  const bottom = Math.max(a.y + a.h, b.y + b.h)
  return { x, y, w: right - x, h: bottom - y }
}

/** Boîte englobante de toute la scène, ou null si vide. */
export function sceneBounds(scene: SceneGraph): Bounds | null {
  let union: Bounds | null = null
  scene.walk((node) => {
    const b = nodeBounds(node)
    if (b) union = union ? mergeBounds(union, b) : b
  })
  return union
}

export function pointInBounds(b: Bounds, x: number, y: number): boolean {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
}

export function rectsIntersect(a: Bounds, b: Bounds): boolean {
  return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y
}

/** Normalise un rectangle quelconque (coins saisis dans le désordre). */
export function normalizeRect(x0: number, y0: number, x1: number, y1: number): Bounds {
  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    w: Math.abs(x1 - x0),
    h: Math.abs(y1 - y0)
  }
}

/**
 * Viewport qui cadre toute la scène avec une marge. Retourne un zoom 1
 * centré si la scène est vide ou sans géométrie.
 */
export function fitViewport(
  scene: SceneGraph,
  width: number,
  height: number,
  padding = 64
): { x: number; y: number; zoom: number } {
  const b = sceneBounds(scene)
  if (!b || b.w <= 0 || b.h <= 0) {
    return { x: width / 2, y: height / 2, zoom: 1 }
  }
  const zoom = Math.min(
    4,
    Math.max(0.05, Math.min((width - padding * 2) / b.w, (height - padding * 2) / b.h))
  )
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  return { x: width / 2 - cx * zoom, y: height / 2 - cy * zoom, zoom }
}
/**
 * Hit-testing précis sur le scene graph. Le pré-filtre par bounding box est
 * fait AVANT tout test fin (architecture §4.3) : les bornes étant
 * conservatives, aucun faux négatif n'est introduit.
 *
 * Le point monde est ramené en espace local du nœud via l'inverse de son
 * transform, puis testé contre la géométrie : intérieur (fill) par
 * point-in-path, proximité au contour (stroke) par distance aux segments
 * aplatis. La tolérance est exprimée dans l'espace local — pour un nœud
 * homothétique xN elle sera effectivement tolérance/N dans le monde.
 */
import type { SceneGraph } from '../scene/SceneGraph'
import type { AnyNode, AnchorPoint, PathNode } from '../scene/SceneNode'
import { applyTransform, inverseTransform } from '../scene/Transform'
import { nodeBounds } from './bounds'
import { flattenCubic, quadraticToCubic } from './bezier'
import { distToSegment, distance, type Vec2 } from './vec'

const DEFAULT_TOLERANCE = 2

export interface HitTestSceneOptions {
  tolerance?: number
  /** Ne pas respecter le verrouillage (sélection en Edit Mode d'ancres). */
  ignoreLocked?: boolean
  /** Ne pas respecter la visibilité (pour des overlays d'édition). */
  ignoreInvisible?: boolean
}

/**
 * Nœud le plus haut (dessiné en dernier) sous le point monde, ou null.
 * Les groupes/textes, masqués et verrouillés sont ignorés par défaut.
 */
export function hitTestScene(scene: SceneGraph, x: number, y: number, options: HitTestSceneOptions = {}): string | null {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE
  const ignoreLocked = options.ignoreLocked ?? false
  const ignoreInvisible = options.ignoreInvisible ?? false

  const visit = (parentId: string | null): string | null => {
    const children = scene.childrenOf(parentId)
    for (let i = children.length - 1; i >= 0; i--) {
      const node = children[i]!
      if (node.type === 'group' || node.type === 'text') continue
      if (!ignoreInvisible && !node.visible) continue
      if (!ignoreLocked && node.locked) continue
      const bounds = nodeBounds(node)
      // Boîte élargie de la tolérance : un point juste hors-bbox peut toucher
      // le stroke (qui déborde de la géométrie) sans être un faux négatif.
      if (!bounds) continue
      const inStrip =
        x >= bounds.x - tolerance &&
        x <= bounds.x + bounds.w + tolerance &&
        y >= bounds.y - tolerance &&
        y <= bounds.y + bounds.h + tolerance
      if (!inStrip) continue
      if (hitTestNode(node, x, y, tolerance)) return node.id
    }
    return null
  }
  return visit(null)
}

/** Test précis contre la géométrie d'un seul nœud dans l'espace monde. */
export function hitTestNode(node: AnyNode, worldX: number, worldY: number, tolerance = DEFAULT_TOLERANCE): boolean {
  const inv = inverseTransform(node.transform)
  if (!inv) return false
  const local = applyTransform(inv, worldX, worldY)

  if (node.type === 'rect') {
    const rx = node.rx ?? 0
    const ry = node.ry ?? rx
    const sdf = roundedRectSdf(local.x, local.y, node.width, node.height, Math.max(rx, ry))
    if (pointInRoundedRect(local.x, local.y, node.width, node.height, rx, ry)) {
      // À l'intérieur : fill, ou stroke si à moins que la tolérance du bord.
      return node.fill !== null || (node.stroke !== null && sdf >= -tolerance)
    }
    return node.stroke !== null && sdf <= tolerance
  }

  if (node.type === 'ellipse') {
    const hw = node.width / 2
    const hh = node.height / 2
    if (hw === 0 || hh === 0) return false
    // L'ellipse est centrée en (hw, hh) en coordonnées locales.
    const nx = (local.x - hw) / hw
    const ny = (local.y - hh) / hh
    const normalized = nx * nx + ny * ny
    if (node.fill !== null && normalized <= 1) return true
    if (node.stroke === null) return false
    const boundaryDist = (Math.sqrt(Math.max(normalized, 0)) - 1) * Math.min(hw, hh)
    return Math.abs(boundaryDist) <= tolerance
  }

  if (node.type === 'path') {
    return hitTestPath(node, local, tolerance)
  }

  return false
}

function hitTestPath(node: PathNode, p: Vec2, tolerance: number): boolean {
  if (node.points.length === 0) return false
  const polyline = flattenPath(node, tolerance * 0.25)
  if (polyline.length < 2) return false

  const insideShape = pointInPolygon(p, polyline)
  if (node.fill !== null && insideShape) return true
  if (node.stroke === null) return false
  for (let i = 1; i < polyline.length; i++) {
    if (distToSegment(p, polyline[i - 1]!, polyline[i]!) <= tolerance) return true
  }
  return false
}

/** Aplatit un chemin en polyline (segments : lignes et courbes Bézier). */
export function flattenPath(node: PathNode, tolerance = 0.5): Vec2[] {
  const anchors = node.points
  if (anchors.length === 0) return []
  const polyline: Vec2[] = [anchors[0]!.position]
  const count = anchors.length
  const lastIndex = node.closed ? count : count - 1
  for (let i = 0; i < lastIndex; i++) {
    const from = anchors[i]!
    const to = anchors[(i + 1) % count]!
    const points = flattenSegment(from, to, tolerance)
    polyline.push(...points.slice(1))
  }
  return polyline
}

/** Points aplatis d'un segment entre deux ancres (gère poignées, cible `to`). */
function flattenSegment(from: AnchorPoint, to: AnchorPoint, tolerance: number): Vec2[] {
  const hasOut = from.handleOut !== null
  const hasIn = to.handleIn !== null
  if (hasOut && hasIn) {
    return flattenCubic(from.position, from.handleOut!, to.handleIn!, to.position, tolerance)
  }
  if (hasOut || hasIn) {
    const control = hasOut ? from.handleOut! : to.handleIn!
    return flattenCubic(...quadraticToCubic(from.position, control, to.position), tolerance)
  }
  return [from.position, to.position]
}

function pointInRoundedRect(px: number, py: number, w: number, h: number, rx: number, ry: number): boolean {
  if (px < 0 || py < 0 || px > w || py > h) return false
  if (rx === 0 || ry === 0) return true
  if (px >= rx && px <= w - rx) return true
  if (py >= ry && py <= h - ry) return true
  const cx = px < w / 2 ? rx : Math.max(rx, w - rx)
  const cy = py < h / 2 ? ry : Math.max(ry, h - ry)
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy <= rx * rx
}

/**
 * Distance signée point → rectangle arrondi (formule SDF classique).
 * Négative à l'intérieur, nulle sur le contour, positive à l'extérieur.
 */
function roundedRectSdf(px: number, py: number, w: number, h: number, r: number): number {
  const qx = Math.abs(px - w / 2) - (w / 2 - r)
  const qy = Math.abs(py - h / 2) - (h / 2 - r)
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  const inside = Math.min(Math.max(qx, qy), 0)
  return outside + inside - r
}

/**
 * Test point-in-polygon par lancer de rayon (parité) sur une polyline.
 * Convient aux chemins ouverts (traités comme fermés implicitement).
 */
export function pointInPolygon(p: Vec2, polyline: readonly Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = polyline.length - 1; i < polyline.length; j = i++) {
    const a = polyline[i]!
    const b = polyline[j]!
    const intersects = a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    if (intersects) inside = !inside
  }
  return inside
}

export interface AnchorHit {
  /** Index du point d'ancrage. */
  index: number
  /** Partie touchée : point ou poignée de contrôle. */
  part: 'position' | 'handleIn' | 'handleOut'
}

/**
 * Cible d'ancrage (position ou poignée) la plus proche du point monde parmi
 * celles à portée, ou null. Sert à l'Edit Mode : déplacement de point/drag
 * de poignée. Les poignées sont prioritaires sur la position (plus petites).
 */
export function hitTestAnchors(node: PathNode, worldX: number, worldY: number, tolerance = DEFAULT_TOLERANCE): AnchorHit | null {
  interface Candidate {
    hit: AnchorHit
    dist: number
  }
  const candidates: Candidate[] = []
  node.points.forEach((anchor, i) => {
    const position = applyTransform(node.transform, anchor.position.x, anchor.position.y)
    const distPosition = distance({ x: worldX, y: worldY }, position)
    if (distPosition <= tolerance) {
      candidates.push({ hit: { index: i, part: 'position' }, dist: distPosition })
    }
    if (anchor.handleIn) {
      const p = applyTransform(node.transform, anchor.handleIn.x, anchor.handleIn.y)
      const d = distance({ x: worldX, y: worldY }, p)
      if (d <= tolerance) candidates.push({ hit: { index: i, part: 'handleIn' }, dist: d })
    }
    if (anchor.handleOut) {
      const p = applyTransform(node.transform, anchor.handleOut.x, anchor.handleOut.y)
      const d = distance({ x: worldX, y: worldY }, p)
      if (d <= tolerance) candidates.push({ hit: { index: i, part: 'handleOut' }, dist: d })
    }
  })
  let best: Candidate | null = null
  for (const candidate of candidates) {
    if (best === null || candidate.dist < best.dist) best = candidate
  }
  return best?.hit ?? null
}
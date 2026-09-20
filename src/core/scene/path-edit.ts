/**
 * Manipulation pure des `AnchorPoint[]` d'un chemin libre, sans dépendance à
 * l'historique ni au DOM. Les commandes undo/redo de la couche store n'ont
 * qu'à appeler ces helpers à mutation applicative.
 */
import type { AnchorPoint, AnchorType } from './SceneNode'
import type { Vec2 } from '../geometry/vec'

/**
 * Déplace l'ancre `index` de `delta` (et ses poignées, dont la tangence doit
 * rester rigidement attachée au point). Retourne un nouveau tableau ; l'entrée
 * n'est pas mutée.
 */
export function moveAnchorPoint(points: AnchorPoint[], index: number, delta: Vec2): AnchorPoint[] {
  const target = points[index]
  if (!target) return points
  return points.map((anchor, i) => {
    if (i !== index) return anchor
    return { ...anchor, position: { x: anchor.position.x + delta.x, y: anchor.position.y + delta.y } }
  })
}

/** Insère une ancre de coin `type` après `index` (clampage aux extrémités). */
export function insertAnchorPoint(points: AnchorPoint[], index: number, position: Vec2): AnchorPoint[] {
  const insertion = clamp(index, -1, points.length - 1) + 1
  const anchor: AnchorPoint = { position: { ...position }, handleIn: null, handleOut: null, type: 'corner' }
  const next = [...points]
  next.splice(insertion, 0, anchor)
  return next
}

/**
 * Supprime l'ancre `index`. Refusée si le chemin deviendrait un segment
 * unique (moins de 2 points restants) : on garde toujours un tracé éditable
 * minimum. Retourne le tableau originel sans le toucher si refusé.
 */
export function removeAnchorPoint(points: AnchorPoint[], index: number): AnchorPoint[] {
  if (points.length < 3) return points
  if (index < 0 || index >= points.length) return points
  return points.filter((_, i) => i !== index)
}

/**
 * Change le type de l'ancre `index` :
 * - corner : poignées réinitialisées (null) ;
 * - smooth : la poignée manquante est miroirée autour de la position depuis
 *   celle qui existe (collinéarité et longueur égales) ;
 * - symmetric : miroir + les deux poignées sont égalisées à la longueur
 *   moyenne des deux existantes.
 * Retourne `points` inchangé si le type est identique.
 */
export function setAnchorType(points: AnchorPoint[], index: number, type: AnchorType): AnchorPoint[] {
  const target = points[index]
  if (!target || target.type === type) return points
  return points.map((anchor, i) => {
    if (i !== index) return anchor
    if (type === 'corner') {
      return { ...anchor, type, handleIn: null, handleOut: null }
    }
    const mirrored = mirrorHandles(anchor)
    if (type === 'smooth') {
      return { ...anchor, type, handleIn: mirrored.handleIn, handleOut: mirrored.handleOut }
    }
    const lengthIn = lengthOf(mirrored.handleIn)
    const lengthOut = lengthOf(mirrored.handleOut)
    const length = (lengthIn + lengthOut) / 2
    return {
      ...anchor,
      type,
      handleIn: resize(mirrored.handleIn, length),
      handleOut: resize(mirrored.handleOut, length)
    }
  })
}

/**
 * Construit la paire de poignées « smooth » : si une seule poignée existe,
 * l'autre devient son symétrique exact autour de la position.
 */
function mirrorHandles(anchor: AnchorPoint): { handleIn: Vec2 | null; handleOut: Vec2 | null } {
  if (anchor.handleIn && !anchor.handleOut) {
    return { handleIn: anchor.handleIn, handleOut: negate(anchor.handleIn) }
  }
  if (!anchor.handleIn && anchor.handleOut) {
    return { handleIn: negate(anchor.handleOut), handleOut: anchor.handleOut }
  }
  return { handleIn: anchor.handleIn, handleOut: anchor.handleOut }
}

function lengthOf(v: Vec2 | null): number {
  return v ? Math.hypot(v.x, v.y) : 0
}

/** Force `v` à la longueur `length` en conservant sa direction (null → null). */
function resize(v: Vec2 | null, length: number): Vec2 | null {
  const current = lengthOf(v)
  if (!v || current === 0) return null
  const scale = length / current
  return { x: v.x * scale, y: v.y * scale }
}

function negate(v: Vec2): Vec2 {
  return { x: v.x === 0 ? 0 : -v.x, y: v.y === 0 ? 0 : -v.y }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
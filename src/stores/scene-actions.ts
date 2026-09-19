import { get } from 'svelte/store'
import {
  createEllipseNode,
  createRectNode,
  DEFAULT_FILL,
  DEFAULT_STROKE
} from '../core/scene/SceneNode'
import type { AnyNode, AnchorType, Paint, PathNode, StrokeStyle } from '../core/scene/SceneNode'
import { translation } from '../core/scene/Transform'
import { primitiveToPath } from '../core/scene/shapes'
import {
  insertAnchorPoint,
  moveAnchorPoint as moveAnchorCore,
  removeAnchorPoint as removeAnchorCore,
  setAnchorType as setAnchorTypeCore
} from '../core/scene/path-edit'
import { commitSceneCommand, mutateNode, sceneGraph } from './scene.store'

export { sceneGraph, mutateNode, toggleNodeVisible } from './scene.store'

export function removeNodes(ids: readonly string[]): void {
  if (ids.length === 0) return
  commitSceneCommand({
    label: 'Supprimer la sélection',
    apply: () => {
      const scene = get(sceneGraph)
      for (const id of ids) scene.removeNode(id)
    }
  })
}

export function renameNode(id: string, name: string): void {
  const trimmed = name.trim()
  if (!trimmed) return
  mutateNode(id, (node) => {
    node.name = trimmed
  }, 'Renommer le calque')
}

export function toggleNodeLocked(id: string): void {
  mutateNode(id, (node) => {
    node.locked = !node.locked
  }, 'Verrouiller / déverrouiller le calque')
}

/**
 * Applique une mutation à plusieurs nœuds en UNE commande réversible
 * (une seule entrée d'historique pour toute la sélection).
 */
export function mutateNodes(
  ids: readonly string[],
  mutate: (node: AnyNode) => void,
  label = 'Modifier les calques'
): void {
  if (ids.length === 0) return
  commitSceneCommand({
    label,
    apply: () => {
      const scene = get(sceneGraph)
      for (const id of ids) {
        const node = scene.getNode(id)
        if (node) mutate(node)
      }
    }
  })
}

/** Définit ou retire le remplissage de plusieurs nœuds en une seule commande. */
export function setNodesFill(ids: readonly string[], fill: Paint | null): void {
  mutateNodes(ids, (node) => {
    node.fill = fill
  }, 'Modifier le remplissage')
}

/** Définit ou retire le contour de plusieurs nœuds en une seule commande. */
export function setNodesStroke(ids: readonly string[], stroke: StrokeStyle | null): void {
  mutateNodes(ids, (node) => {
    node.stroke = stroke
  }, 'Modifier le contour')
}

/**
 * Ajoute/retire le remplissage par défaut sur un nœud. Quand tous les nœuds
 * sélectionnés ont déjà un remplissage, il est retiré ; sinon il est ajouté
 * là où il manque (remplissage uniforme garanti sur toute la sélection).
 */
export function toggleNodesFill(ids: readonly string[]): void {
  if (ids.length === 0) return
  const allFilled = ids.every((id) => get(sceneGraph).getNode(id)?.fill != null)
  mutateNodes(ids, (node) => {
    node.fill = allFilled ? null : node.fill ?? { ...DEFAULT_FILL }
  }, 'Remplissage : ajouter / retirer')
}

/**
 * Ajoute/retire le contour par défaut sur un nœud — même sémantique
 * d'ensemble que `toggleNodesFill`.
 */
export function toggleNodesStroke(ids: readonly string[]): void {
  if (ids.length === 0) return
  const allStroked = ids.every((id) => get(sceneGraph).getNode(id)?.stroke != null)
  mutateNodes(ids, (node) => {
    node.stroke = allStroked ? null : node.stroke ?? { ...DEFAULT_STROKE }
  }, 'Contour : ajouter / retirer')
}

/**
 * Déplace un nœud sans écraser sa matrice. `coalesceKey` identique pendant un
 * drag permet de fusionner tous les déplacements en une seule entrée d'historique.
 */
export function setNodeTranslation(
  id: string,
  x: number,
  y: number,
  coalesceKey?: string
): void {
  commitSceneCommand({
    label: 'Déplacer',
    coalesceKey,
    apply: () => {
      const node = get(sceneGraph).getNode(id)
      if (node) node.transform = { ...node.transform, m02: x, m12: y }
    }
  })
}

export function createRect(x: number, y: number, w: number, h: number): string {
  return createShape('rect', x, y, w, h)
}

export function createEllipse(x: number, y: number, w: number, h: number): string {
  return createShape('ellipse', x, y, w, h)
}

function createShape(
  type: 'rect' | 'ellipse',
  x: number,
  y: number,
  w: number,
  h: number
): string {
  let id = ''
  commitSceneCommand({
    label: type === 'rect' ? 'Créer un rectangle' : 'Créer une ellipse',
    apply: () => {
      const scene = get(sceneGraph)
      id = scene.generateId(type)
      const node =
        type === 'rect'
          ? createRectNode(id, { width: w, height: h })
          : createEllipseNode(id, { width: w, height: h })
      node.transform = translation(x, y)
      node.fill = { ...DEFAULT_FILL }
      scene.addNode(node)
    }
  })
  return id
}

/**
 * Convertit une primitive (rect/ellipse) en chemin libre, en place, via une
 * commande réversible — déclenché à la première édition de points. La
 * géométrie résultante est celle de `core/scene/shapes`.
 */
export function convertToPath(id: string): void {
  mutateNode(id, (node) => {
    if (node.type !== 'rect' && node.type !== 'ellipse') return
    const path = primitiveToPath(node)
    const target = node as unknown as PathNode
    target.type = 'path'
    target.points = path.points
    target.closed = path.closed
  }, 'Convertir en chemin')
}

function asPathNode(id: string): PathNode | null {
  const node = get(sceneGraph).getNode(id)
  return node?.type === 'path' ? node : null
}

/** Déplace l'ancre `index` du chemin `id` de `delta` (coalescé pendant le drag). */
export function moveAnchorPoint(id: string, index: number, dx: number, dy: number): void {
  commitSceneCommand({
    label: 'Déplacer un point',
    apply: () => {
      const path = asPathNode(id)
      if (path) path.points = moveAnchorCore(path.points, index, { x: dx, y: dy })
    }
  })
}

/** Insère une ancre de coin après `index` du chemin `id`. */
export function addAnchorPoint(id: string, index: number, x: number, y: number): void {
  commitSceneCommand({
    label: 'Ajouter un point',
    apply: () => {
      const path = asPathNode(id)
      if (path) path.points = insertAnchorPoint(path.points, index, { x, y })
    }
  })
}

/** Supprime l'ancre `index` du chemin `id` (refusé si < 2 ancres restantes). */
export function removeAnchorPoint(id: string, index: number): void {
  commitSceneCommand({
    label: 'Supprimer un point',
    apply: () => {
      const path = asPathNode(id)
      if (path) path.points = removeAnchorCore(path.points, index)
    }
  })
}

/** Change le type (corner/smooth/symmetric) de l'ancre `index`. */
export function setAnchorPointType(id: string, index: number, type: AnchorType): void {
  commitSceneCommand({
    label: 'Type de point',
    apply: () => {
      const path = asPathNode(id)
      if (path) path.points = setAnchorTypeCore(path.points, index, type)
    }
  })
}

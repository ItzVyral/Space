/**
 * Helpers de l'Edit Mode : quels nœuds sont éditables et comment y accéder.
 * Les primitives (rect/ellipse) sont éditables (converties en chemin libre à
 * la première édition, voir scene/shapes.ts) ; les groupes et textes non.
 */
import type { AnyNode } from '../scene/SceneNode'

export type EditableNode = Extract<AnyNode, { type: 'path' | 'rect' | 'ellipse' }>

export function isEditableNode(node: AnyNode): node is EditableNode {
  return (
    (node.type === 'path' || node.type === 'rect' || node.type === 'ellipse') &&
    !node.locked &&
    node.visible
  )
}

/** Les primitives doivent être converties en chemin pour l'édition de points. */
export function isPrimitive(node: AnyNode): node is Extract<EditableNode, { type: 'rect' | 'ellipse' }> {
  return node.type === 'rect' || node.type === 'ellipse'
}
import { derived, get, writable } from 'svelte/store'
import { ModeManager } from '../core/modes/ModeManager'
import type { ModeState } from '../core/modes/ModeManager'
import { isEditableNode } from '../core/modes/EditMode'
import { sceneGraph } from './scene.store'

/**
 * Façade Svelte sur le ModeManager (core/modes) : transitions Object ⇄ Edit
 * validées contre la scène courante. C'est la couche d'accès utilisée par
 * l'UI (double-clic, Tab/Échap) — le état vivant reste dans core.
 */
const manager = new ModeManager({
  canEdit: (id) => {
    const node = get(sceneGraph).getNode(id)
    return node !== undefined && isEditableNode(node)
  }
})

const internalState = writable<ModeState>(manager.getState())
manager.subscribe((state) => internalState.set(state))

/** Mode actif (reactif). */
export const mode = derived(internalState, (state) => state.mode)

/** Nœud en édition en Edit Mode (reactif), ou null en Object Mode. */
export const editingNodeId = derived(internalState, (state) => state.editingNodeId)

export function enterEdit(nodeId: string): boolean {
  return manager.enterEdit(nodeId)
}

export function exitEdit(): boolean {
  return manager.exitEdit()
}

/** Bascule : Edit→Object, ou Object→Edit sur `nodeId`. */
export function toggleEdit(nodeId?: string): boolean {
  return manager.toggle(nodeId)
}
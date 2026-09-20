import { writable } from 'svelte/store'
import type { Readable } from 'svelte/store'
import { UndoRedoStack } from '../core/history/UndoRedoStack'
import type { HistoryCommand } from '../core/history/UndoRedoStack'
import { createSceneGraphCommand } from '../core/history/SceneGraphCommand'
import type { SceneGraph } from '../core/scene/SceneGraph'
import type { SceneGraphCommandOptions } from '../core/history/SceneGraphCommand'

/**
 * Pile d'historique globale (une seule par document). Le renderer est
 * re-déclenché par la couche scene.store qui observe `historyState`.
 */
const stack = new UndoRedoStack()

const internalState = writable({ canUndo: false, canRedo: false, size: 0 })
stack.subscribe((state) => internalState.set(state))

/** État d'historique observable (boutons undo/redo, raccourcis clavier). */
export const historyState: Readable<{ canUndo: boolean; canRedo: boolean; size: number }> = {
  subscribe: internalState.subscribe
}

/** Pousse une commande générique (scène ou autre). */
export function pushCommand(command: HistoryCommand): void {
  stack.push(command)
}

/** Crée et pousse une commande réversible sur une mutation du scene graph. */
export function runSceneGraphCommand(scene: SceneGraph, options: SceneGraphCommandOptions): void {
  stack.push(createSceneGraphCommand(scene, options))
}

export function undo(): boolean {
  return stack.undo()
}

export function redo(): boolean {
  return stack.redo()
}

export function clearHistory(): void {
  stack.clear()
}
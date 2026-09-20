/**
 * Historie undo/redo — pattern Command.
 *
 * Toute mutation du scene graph doit passer par une commande réversible
 * poussée sur cette pile (voir docs/ARCHITECTURE.md §3.1) : jamais de
 * mutation directe d'un nœud hors de ce flux.
 *
 * Le coalescing permet de regrouper des mutations consécutives d'une même
 * opération continue (drag d'un curseur, déplacement d'un nœud) : deux
 * commandes consécutives partageant une même `coalesceKey` fusionnent en
 * une seule entrée d'historique.
 */

export interface HistoryState {
  canUndo: boolean
  canRedo: boolean
  size: number
}

export interface HistoryCommand {
  readonly label: string
  /** Si défini, deux commandes consécutives partageant cette clé fusionnent. */
  readonly coalesceKey?: string
  undo(): void
  redo(): void
  /**
   * Étend la portée de la commande en absorbant la commande suivante
   * (coalescing). Implémenté uniquement par les commandes fusionnables.
   */
  absorb?(following: HistoryCommand): void
}

export type HistoryListener = (state: HistoryState) => void

export const DEFAULT_HISTORY_LIMIT = 100

export class UndoRedoStack {
  private readonly commands: HistoryCommand[] = []
  private readonly redone: HistoryCommand[] = []
  private readonly listeners = new Set<HistoryListener>()
  private readonly limit: number

  constructor(limit: number = DEFAULT_HISTORY_LIMIT) {
    this.limit = Math.max(1, Math.floor(limit))
  }

  get canUndo(): boolean {
    return this.commands.length > 0
  }

  get canRedo(): boolean {
    return this.redone.length > 0
  }

  get size(): number {
    return this.commands.length
  }

  push(command: HistoryCommand): void {
    const top = this.commands.at(-1)
    if (top !== undefined && top !== command && top.coalesceKey !== undefined && top.absorb !== undefined) {
      if (top.coalesceKey === command.coalesceKey) {
        top.absorb(command)
        this.redone.length = 0
        this.notify()
        return
      }
    }
    this.redone.length = 0
    this.commands.push(command)
    if (this.commands.length > this.limit) {
      this.commands.shift()
    }
    this.notify()
  }

  /** Annule la dernière commande. Retourne false si aucune commande à annuler. */
  undo(): boolean {
    const command = this.commands.pop()
    if (command === undefined) return false
    command.undo()
    this.redone.push(command)
    this.notify()
    return true
  }

  /** Ré-exécute la dernière commande annulée. Retourne false si aucune. */
  redo(): boolean {
    const command = this.redone.pop()
    if (command === undefined) return false
    command.redo()
    this.commands.push(command)
    this.notify()
    return true
  }

  clear(): void {
    if (this.commands.length === 0 && this.redone.length === 0) return
    this.commands.length = 0
    this.redone.length = 0
    this.notify()
  }

  /** S'abonne aux changements d'état. Notifie immédiatement avec l'état courant. */
  subscribe(listener: HistoryListener): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private getState(): HistoryState {
    return { canUndo: this.canUndo, canRedo: this.canRedo, size: this.size }
  }

  private notify(): void {
    const state = this.getState()
    for (const listener of this.listeners) listener(state)
  }
}
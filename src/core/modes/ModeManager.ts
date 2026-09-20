/**
 * Gestionnaire de modes (paradigme Blender) : Object Mode (défaut) et Edit
 * Mode. L'Edit Mode s'active sur UN SEUL objet éditable et enregistre son
 * identifiant ; la sortie (Tab/Échap) revient en Object Mode, la sélection
 * restant gérée par la couche store.
 *
 * Le ModeManager est agnostique de l'UI : la capacité « ce nœud est-il
 * éditable ? » est injectée au constructeur (résolue par la couche store sur
 * le scene graph courant).
 */
export type AppMode = 'object' | 'edit'

export interface ModeState {
  mode: AppMode
  /** Nœud en édition en Edit Mode ; null en Object Mode. */
  editingNodeId: string | null
}

export type ModeListener = (state: ModeState) => void

export interface ModeManagerDeps {
  /** Retourne si le nœud peut être passé en Edit Mode (single, non verrouillé). */
  canEdit(nodeId: string): boolean
}

export class ModeManager {
  private state: ModeState = { mode: 'object', editingNodeId: null }
  private readonly listeners = new Set<ModeListener>()
  private readonly deps: ModeManagerDeps

  constructor(deps: ModeManagerDeps) {
    this.deps = deps
  }

  get current(): AppMode {
    return this.state.mode
  }

  get editingNodeId(): string | null {
    return this.state.editingNodeId
  }

  getState(): ModeState {
    return { ...this.state }
  }

  /**
   * Entre en Edit Mode sur `nodeId`. Refusé si un mode est déjà en édition,
   * si le nœud n'est pas éditable ou est introuvable. Retourne false en cas
   * de refus, sans changer l'état.
   */
  enterEdit(nodeId: string): boolean {
    if (this.state.mode === 'edit') return false
    if (!this.deps.canEdit(nodeId)) return false
    this.state = { mode: 'edit', editingNodeId: nodeId }
    this.notify()
    return true
  }

  /** Sort de l'Edit Mode vers l'Object Mode. Retourne false si déjà en Object. */
  exitEdit(): boolean {
    if (this.state.mode !== 'edit') return false
    this.state = { mode: 'object', editingNodeId: null }
    this.notify()
    return true
  }

  /** Bascule : Object→Edit sur `nodeId` (si valide), Edit→Object. */
  toggle(nodeId?: string): boolean {
    if (this.state.mode === 'edit') return this.exitEdit()
    return nodeId !== undefined ? this.enterEdit(nodeId) : false
  }

  /** S'abonne aux changements de mode. Notifie immédiatement avec l'état courant. */
  subscribe(listener: ModeListener): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    const state = this.getState()
    for (const listener of this.listeners) listener(state)
  }
}
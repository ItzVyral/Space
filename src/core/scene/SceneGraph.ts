import type { AnyNode } from './SceneNode'

export class SceneGraph {
  private readonly nodes = new Map<string, AnyNode>()
  private readonly childrenByParent = new Map<string | null, string[]>()
  private counter = 0

  get size(): number {
    return this.nodes.size
  }

  addNode(node: AnyNode, parentId: string | null = null): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Un nœud avec l'identifiant "${node.id}" existe déjà`)
    }
    node.parentId = parentId
    this.nodes.set(node.id, node)
    this.pushChild(parentId, node.id)
  }

  getNode(id: string): AnyNode | undefined {
    return this.nodes.get(id)
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id)
  }

  childrenOf(parentId: string | null = null): AnyNode[] {
    return (this.childrenByParent.get(parentId) ?? [])
      .map((id) => this.nodes.get(id))
      .filter((node): node is AnyNode => node !== undefined)
  }

  removeNode(id: string): void {
    this.removeSubtree(id)
  }

  clear(): void {
    this.nodes.clear()
    this.childrenByParent.clear()
  }

  walk(callback: (node: AnyNode) => void, parentId: string | null = null): void {
    for (const childId of this.childrenByParent.get(parentId) ?? []) {
      const node = this.nodes.get(childId)
      if (!node) continue
      callback(node)
      this.walk(callback, childId)
    }
  }

  generateId(base = 'node'): string {
    let id = ''
    do {
      id = `${base}_${++this.counter}`
    } while (this.nodes.has(id))
    return id
  }

  /**
   * Réordonne un nœud dans la liste des enfants de son parent courant.
   * `index` 0 = premier enfant (bas de pile / arrière-plan) ; l'indice le plus
   * élevé = sommet de pile (avant-plan).
   */
  reorderChild(childId: string, index: number): void {
    const node = this.nodes.get(childId)
    if (!node) {
      throw new Error(`Nœud "${childId}" introuvable`)
    }
    this.moveChild(childId, node.parentId, index)
  }

  /**
   * Déplace un nœud vers la liste des enfants de `parentId` (nouveau parent ou
   * même parent pour un simple réordonnancement), à la position `index`.
   *
   * L'indice est celui d'arrivée dans la liste du parent une fois le nœud
   * retiré de son ancienne liste, puis borné à `[0, longueur]`. Refuse les
   * cycles (déplacement d'un nœud dans lui-même ou dans l'un de ses
   * descendants) et les parents inexistants.
   */
  moveChild(childId: string, parentId: string | null, index: number): void {
    const node = this.nodes.get(childId)
    if (!node) {
      throw new Error(`Nœud "${childId}" introuvable`)
    }
    this.assertNoCycle(childId, parentId)
    this.removeChild(node.parentId, childId)
    node.parentId = parentId
    const siblings = this.childrenByParent.get(parentId) ?? []
    const clamped = Math.max(0, Math.min(index, siblings.length))
    siblings.splice(clamped, 0, childId)
    this.childrenByParent.set(parentId, siblings)
  }

  private assertNoCycle(childId: string, parentId: string | null): void {
    if (parentId === null) return
    if (parentId === childId) {
      throw new Error(`Impossible de déplacer le nœud "${childId}" dans lui-même`)
    }
    if (!this.nodes.has(parentId)) {
      throw new Error(`Parent "${parentId}" introuvable`)
    }
    let ancestor: string | null = parentId
    while (ancestor !== null) {
      if (ancestor === childId) {
        throw new Error(`Impossible de déplacer "${childId}" dans l'un de ses descendants`)
      }
      ancestor = this.nodes.get(ancestor)?.parentId ?? null
    }
  }

  private removeSubtree(id: string): void {
    const node = this.nodes.get(id)
    if (!node) return
    for (const childId of [...(this.childrenByParent.get(id) ?? [])]) {
      this.removeSubtree(childId)
    }
    this.removeChild(node.parentId, id)
    this.childrenByParent.delete(id)
    this.nodes.delete(id)
  }

  private pushChild(parentId: string | null, childId: string): void {
    const siblings = this.childrenByParent.get(parentId) ?? []
    siblings.push(childId)
    this.childrenByParent.set(parentId, siblings)
  }

  private removeChild(parentId: string | null, childId: string): void {
    const siblings = this.childrenByParent.get(parentId)
    if (!siblings) return
    const index = siblings.indexOf(childId)
    if (index !== -1) siblings.splice(index, 1)
    if (siblings.length === 0) this.childrenByParent.delete(parentId)
  }
}
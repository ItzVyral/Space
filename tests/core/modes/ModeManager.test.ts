import { describe, expect, it } from 'vitest'
import { isEditableNode } from '../../../src/core/modes/EditMode'
import { ModeManager } from '../../../src/core/modes/ModeManager'
import { createEllipseNode, createGroupNode, createPathNode, createRectNode, createTextNode } from '../../../src/core/scene/SceneNode'

describe('ModeManager', () => {
  it('démarre en Object Mode, sans nœud en édition', () => {
    const manager = new ModeManager({ canEdit: () => true })
    expect(manager.current).toBe('object')
    expect(manager.editingNodeId).toBeNull()
  })

  it('enterEdit : entre en édition quand le nœud est éditable', () => {
    const manager = new ModeManager({ canEdit: (id) => id === 'ok' })
    expect(manager.enterEdit('ok')).toBe(true)
    expect(manager.current).toBe('edit')
    expect(manager.editingNodeId).toBe('ok')
  })

  it('enterEdit : refusé si le nœud est refusé par la garde', () => {
    const manager = new ModeManager({ canEdit: () => false })
    expect(manager.enterEdit('x')).toBe(false)
    expect(manager.current).toBe('object')
    expect(manager.editingNodeId).toBeNull()
  })

  it('enterEdit : refusé si déjà en Edit Mode', () => {
    const manager = new ModeManager({ canEdit: () => true })
    manager.enterEdit('a')
    expect(manager.enterEdit('b')).toBe(false)
    expect(manager.editingNodeId).toBe('a')
  })

  it('exitEdit : revient en Object Mode et vide l\'édition', () => {
    const manager = new ModeManager({ canEdit: () => true })
    manager.enterEdit('n')
    expect(manager.exitEdit()).toBe(true)
    expect(manager.current).toBe('object')
    expect(manager.editingNodeId).toBeNull()
  })

  it('exitEdit : false en Object Mode (état inchangé)', () => {
    const manager = new ModeManager({ canEdit: () => true })
    expect(manager.exitEdit()).toBe(false)
  })

  it('toggle : Edit→Object, puis Object→Edit', () => {
    const manager = new ModeManager({ canEdit: (id) => id === 'n' })
    expect(manager.toggle('n')).toBe(true)
    expect(manager.toggle()).toBe(true)
    expect(manager.current).toBe('object')
  })

  it('toggle sans nœud en Object Mode : refusé', () => {
    const manager = new ModeManager({ canEdit: () => false })
    expect(manager.toggle()).toBe(false)
    expect(manager.current).toBe('object')
  })

  it('subscribe : notifie immédiatement puis à chaque transition', () => {
    const manager = new ModeManager({ canEdit: () => true })
    const seen: string[] = []
    const unsubscribe = manager.subscribe((state) => seen.push(state.mode))
    expect(seen).toEqual(['object'])
    manager.enterEdit('n')
    manager.exitEdit()
    expect(seen).toEqual(['object', 'edit', 'object'])
    unsubscribe()
    manager.enterEdit('n')
    expect(seen).toEqual(['object', 'edit', 'object'])
  })

  it('getState renvoie une copie (immuable)', () => {
    const manager = new ModeManager({ canEdit: () => true })
    manager.enterEdit('n')
    const state = manager.getState()
    expect(state).toEqual({ mode: 'edit', editingNodeId: 'n' })
    // Une copie : changer le snapshot ne doit pas affecter le manager.
    state.editingNodeId = 'hack'
    expect(manager.editingNodeId).toBe('n')
  })
})

describe('EditMode helpers', () => {
  it('un chemin, rectangle ou ellipse éditable', () => {
    expect(isEditableNode(createPathNode('p'))).toBe(true)
    expect(isEditableNode(createRectNode('r', { width: 1, height: 1 }))).toBe(true)
    expect(isEditableNode(createEllipseNode('e', { width: 1, height: 1 }))).toBe(true)
  })

  it('groupe, texte, verrouillé ou masqué : non éditable', () => {
    expect(isEditableNode(createGroupNode('g'))).toBe(false)
    expect(isEditableNode(createTextNode('t'))).toBe(false)
    const locked = createPathNode('l')
    locked.locked = true
    expect(isEditableNode(locked)).toBe(false)
    const hidden = createRectNode('h', { width: 1, height: 1 })
    hidden.visible = false
    expect(isEditableNode(hidden)).toBe(false)
  })
})
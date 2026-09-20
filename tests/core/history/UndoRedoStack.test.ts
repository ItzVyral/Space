import { describe, expect, it, vi } from 'vitest'
import { UndoRedoStack, DEFAULT_HISTORY_LIMIT } from '../../../src/core/history/UndoRedoStack'
import type { HistoryCommand } from '../../../src/core/history/UndoRedoStack'

interface MockCommandOptions {
  label: string
  coalesceKey?: string
  undo?: () => void
  redo?: () => void
  absorb?: (following: HistoryCommand) => void
}

function makeCommand(options: MockCommandOptions): HistoryCommand {
  return {
    label: options.label,
    coalesceKey: options.coalesceKey,
    undo: options.undo ?? vi.fn(),
    redo: options.redo ?? vi.fn(),
    absorb: options.absorb
  }
}

function logCommand(label: string, entries: string[]): HistoryCommand {
  return makeCommand({ label, undo: () => entries.push(`undo:${label}`), redo: () => entries.push(`redo:${label}`) })
}

describe('UndoRedoStack', () => {
  it('annule puis ré-exécute dans l\'ordre LIFO', () => {
    const entries: string[] = []
    const stack = new UndoRedoStack()
    stack.push(logCommand('a', entries))
    stack.push(logCommand('b', entries))

    expect(stack.undo()).toBe(true)
    expect(stack.undo()).toBe(true)
    expect(entries).toEqual(['undo:b', 'undo:a'])

    expect(stack.redo()).toBe(true)
    expect(stack.redo()).toBe(true)
    expect(entries).toEqual(['undo:b', 'undo:a', 'redo:a', 'redo:b'])
  })

  it('refuse undo/redo sur une pile vide sans erreur', () => {
    const stack = new UndoRedoStack()
    expect(stack.undo()).toBe(false)
    expect(stack.redo()).toBe(false)
    expect(stack.canUndo).toBe(false)
    expect(stack.canRedo).toBe(false)
    expect(stack.size).toBe(0)
  })

  it('une nouvelle commande invalide la file de redo', () => {
    const stack = new UndoRedoStack()
    stack.push(makeCommand({ label: 'a' }))
    stack.push(makeCommand({ label: 'b' }))
    stack.undo()
    expect(stack.canRedo).toBe(true)

    stack.push(makeCommand({ label: 'c' }))
    expect(stack.canRedo).toBe(false)
    expect(stack.size).toBe(2)
  })

  it('borne la taille de l\'historique à la limite', () => {
    const stack = new UndoRedoStack(2)
    stack.push(makeCommand({ label: '1' }))
    stack.push(makeCommand({ label: '2' }))
    stack.push(makeCommand({ label: '3' }))
    expect(stack.size).toBe(2)
    stack.undo()
    expect(stack.canUndo).toBe(true)
    stack.undo()
    expect(stack.canUndo).toBe(false)
  })

  it('clear() vide undo et redo', () => {
    const stack = new UndoRedoStack()
    stack.push(makeCommand({ label: 'a' }))
    stack.undo()
    stack.clear()
    expect(stack.canUndo).toBe(false)
    expect(stack.canRedo).toBe(false)
    expect(stack.size).toBe(0)
  })

  it('notifie les abonnés et renvoie l\'état courant', () => {
    const stack = new UndoRedoStack()
    const listener = vi.fn()
    stack.subscribe(listener)
    expect(listener).toHaveBeenCalledWith({ canUndo: false, canRedo: false, size: 0 })

    stack.push(makeCommand({ label: 'a' }))
    expect(listener).toHaveBeenLastCalledWith({ canUndo: true, canRedo: false, size: 1 })
    stack.undo()
    expect(listener).toHaveBeenLastCalledWith({ canUndo: false, canRedo: true, size: 0 })
    stack.redo()
    expect(listener).toHaveBeenLastCalledWith({ canUndo: true, canRedo: false, size: 1 })
  })

  it('arrête de notifier après désabonnement', () => {
    const stack = new UndoRedoStack()
    const listener = vi.fn()
    const unsubscribe = stack.subscribe(listener)
    unsubscribe()
    stack.push(makeCommand({ label: 'a' }))
    stack.undo()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('fusionne deux commandes consécutives partageant une coalesceKey', () => {
    const stack = new UndoRedoStack()
    const first = makeCommand({ label: 'drag', coalesceKey: 'move:A', absorb: vi.fn() })
    const second = makeCommand({ label: 'drag', coalesceKey: 'move:A', absorb: vi.fn() })
    stack.push(first)
    stack.push(second)

    expect(stack.size).toBe(1)
    expect(first.absorb).toHaveBeenCalledWith(second)
  })

  it('ne fusionne pas sans coalesceKey ou avec des clés différentes', () => {
    const stack = new UndoRedoStack()
    stack.push(makeCommand({ label: 'a', absorb: vi.fn() }))
    stack.push(makeCommand({ label: 'a', coalesceKey: 'k', absorb: vi.fn() }))
    expect(stack.size).toBe(2)

    stack.clear()
    stack.push(makeCommand({ label: 'a', coalesceKey: 'k1', absorb: vi.fn() }))
    stack.push(makeCommand({ label: 'a', coalesceKey: 'k2', absorb: vi.fn() }))
    expect(stack.size).toBe(2)
  })

  it('le coalescing invalide aussi la file de redo', () => {
    const absorb = vi.fn()
    const stack = new UndoRedoStack()
    stack.push(makeCommand({ label: 'a', coalesceKey: 'k', absorb }))
    expect(stack.undo()).toBe(true)
    expect(stack.canRedo).toBe(true)

    stack.push(makeCommand({ label: 'b', coalesceKey: 'k', absorb }))
    expect(stack.canRedo).toBe(false)
    expect(stack.size).toBe(1)
  })

  it('limite par défaut à 100 commandes', () => {
    expect(DEFAULT_HISTORY_LIMIT).toBe(100)
    const stack = new UndoRedoStack()
    for (let i = 0; i < 120; i++) {
      stack.push(makeCommand({ label: `cmd-${i}` }))
    }
    expect(stack.size).toBe(DEFAULT_HISTORY_LIMIT)
  })
})
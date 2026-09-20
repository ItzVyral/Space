import { writable } from 'svelte/store'

export type ToolId =
  | 'move'
  | 'frame'
  | 'pen'
  | 'text'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'hand'
  | 'comment'

export const TOOL_IDS: readonly ToolId[] = [
  'move',
  'frame',
  'pen',
  'text',
  'rect',
  'ellipse',
  'line',
  'hand',
  'comment'
]

export const TOOL_SHORTCUTS: Readonly<Record<string, ToolId>> = {
  v: 'move',
  f: 'frame',
  p: 'pen',
  t: 'text',
  r: 'rect',
  o: 'ellipse',
  l: 'line',
  h: 'hand',
  c: 'comment'
}

export const ENABLED_TOOLS: ReadonlySet<ToolId> = new Set(['move', 'rect', 'ellipse', 'hand'])

export const activeTool = writable<ToolId>('move')

export function isToolEnabled(id: ToolId): boolean {
  return ENABLED_TOOLS.has(id)
}

export function setTool(id: ToolId): void {
  if (!isToolEnabled(id)) return
  activeTool.set(id)
}

export function toolFromShortcut(key: string): ToolId | null {
  return TOOL_SHORTCUTS[key.toLowerCase()] ?? null
}

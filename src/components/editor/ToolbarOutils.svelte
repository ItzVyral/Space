<script lang="ts">
  import type { Component } from 'svelte'
  import Icon from '../ui/Icon.svelte'
  import Tooltip from '../ui/Tooltip.svelte'
  import {
    MousePointer2,
    Frame,
    PenTool,
    Type,
    Square,
    Circle,
    Minus,
    Hand,
    MessageSquare
  } from '@lucide/svelte'
  import { activeTool, isToolEnabled, setTool, type ToolId } from '../../stores/tool.store'

  interface Tool {
    id: ToolId
    label: string
    shortcut: string
    icon: Component
  }

  const tools: Tool[] = [
    { id: 'move', label: 'Déplacer', shortcut: 'V', icon: MousePointer2 },
    { id: 'frame', label: 'Frame — bientôt', shortcut: 'F', icon: Frame },
    { id: 'pen', label: 'Plume — bientôt', shortcut: 'P', icon: PenTool },
    { id: 'text', label: 'Texte — bientôt', shortcut: 'T', icon: Type },
    { id: 'rect', label: 'Rectangle', shortcut: 'R', icon: Square },
    { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: Circle },
    { id: 'line', label: 'Ligne — bientôt', shortcut: 'L', icon: Minus },
    { id: 'hand', label: 'Main', shortcut: 'H', icon: Hand },
    { id: 'comment', label: 'Commentaire — bientôt', shortcut: 'C', icon: MessageSquare }
  ]
</script>

<div class="rail" aria-label="Outils">
  {#each tools as tool (tool.id)}
    <Tooltip label={tool.label} shortcut={tool.shortcut} position="right">
      <button
        type="button"
        class="tool"
        class:tool-active={$activeTool === tool.id}
        disabled={!isToolEnabled(tool.id)}
        onclick={() => setTool(tool.id)}
        aria-pressed={$activeTool === tool.id}
      >
        <Icon name={tool.icon} size={16} strokeWidth={1.8} />
      </button>
    </Tooltip>
  {/each}
</div>

<style>
  .rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 44px;
    padding: 6px 0;
    flex-shrink: 0;
    border-right: 1px solid var(--border);
    background: var(--surface);
  }
  .tool {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    transition:
      background-color 90ms ease,
      color 90ms ease;
  }
  .tool:hover:not(:disabled) {
    background: var(--hover);
    color: var(--text);
  }
  .tool:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .tool-active,
  .tool-active:hover:not(:disabled) {
    background: var(--accent);
    color: var(--accent-fg);
  }
</style>

<script lang="ts">
  import Icon from '../ui/Icon.svelte'
  import { Square, Circle, Minus, Type, Image, Frame, PenTool } from '@lucide/svelte'
  import type { Component } from 'svelte'

  interface Asset {
    id: string
    label: string
    icon: Component
  }

  const assets: Asset[] = [
    { id: 'rect', label: 'Rectangle', icon: Square },
    { id: 'ellipse', label: 'Ellipse', icon: Circle },
    { id: 'line', label: 'Ligne', icon: Minus },
    { id: 'text', label: 'Texte', icon: Type },
    { id: 'frame', label: 'Frame', icon: Frame },
    { id: 'path', label: 'Plume', icon: PenTool },
    { id: 'image', label: 'Image', icon: Image }
  ]
</script>

<div class="panel">
  <div class="panel-head">
    <span class="panel-title">Assets</span>
  </div>

  <p class="hint">
    Glissez un composant dans le canvas. L’ajout réel arrivera avec le backend.
  </p>

  <div class="grid">
    {#each assets as asset (asset.id)}
      <div class="tile" draggable="true">
        <span class="tile-icon">
          <Icon name={asset.icon} size={18} strokeWidth={1.7} />
        </span>
        <span class="tile-label">{asset.label}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 34px;
    padding: 0 16px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--border);
  }
  .panel-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--text-secondary);
  }
  .hint {
    margin: 10px 12px;
    font-size: 12px;
    line-height: 1.45;
    color: var(--text-tertiary);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    padding: 0 12px 12px;
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 78px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-subtle);
    color: var(--text-secondary);
    cursor: grab;
    transition:
      border-color 90ms ease,
      background-color 90ms ease,
      color 90ms ease;
  }
  .tile:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent);
  }
  .tile-label {
    font-size: 11.5px;
  }
</style>
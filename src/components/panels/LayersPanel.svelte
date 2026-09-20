<script lang="ts">
  import Icon from '../ui/Icon.svelte'
  import Tooltip from '../ui/Tooltip.svelte'
  import {
    Square,
    Circle,
    PenTool,
    Type,
    Layers,
    Eye,
    EyeOff,
    Lock,
    LockOpen,
    GripVertical
  } from '@lucide/svelte'
  import { flip } from 'svelte/animate'
  import type { Component } from 'svelte'
  import {
    renameNode,
    sceneGraph,
    toggleNodeLocked,
    toggleNodeVisible
  } from '../../stores/scene-actions'
  import { selectOnly, selection, toggleInSelection } from '../../stores/selection.store'
  import { reorderNode } from '../../stores/scene.store'
  import type { AnyNode } from '../../core/scene/SceneNode'

  const ROW_HEIGHT = 28
  const ROW_GAP = 1
  const ROW_STEP = ROW_HEIGHT + ROW_GAP
  const LIST_PAD_TOP = 4

  let renamingId = $state<string | null>(null)
  let draft = $state('')
  let anchorId = $state<string | null>(null)
  let listEl: HTMLDivElement
  let dragId = $state<string | null>(null)
  let dragPointerId: number | null = null
  let dropSlot = $state<number | null>(null)

  const nodes = $derived([...$sceneGraph.childrenOf(null)].reverse())

  function nodeIcon(type: AnyNode['type']): Component {
    switch (type) {
      case 'rect':
        return Square
      case 'ellipse':
        return Circle
      case 'text':
        return Type
      case 'group':
        return Layers
      default:
        return PenTool
    }
  }

  function handleSelect(e: MouseEvent, id: string): void {
    if (e.shiftKey && anchorId !== null) {
      const ids = nodes.map((n) => n.id)
      const from = ids.indexOf(anchorId)
      const to = ids.indexOf(id)
      if (from !== -1 && to !== -1) {
        const [lo, hi] = from < to ? [from, to] : [to, from]
        selectOnly(ids.slice(lo, hi + 1))
        return
      }
    }
    if (e.ctrlKey || e.metaKey) {
      toggleInSelection(id)
      anchorId = id
      return
    }
    selectOnly([id])
    anchorId = id
  }

  function startRename(node: AnyNode): void {
    renamingId = node.id
    draft = node.name
  }

  function focusOnMount(input: HTMLInputElement): void {
    input.focus()
    input.select()
  }

  function commitRename(): void {
    if (renamingId) renameNode(renamingId, draft)
    renamingId = null
  }

  // ——— Drag & drop de réordonnancement ———
  // La liste affichée est inversée (sommet de pile en haut). `dropSlot` est la
  // position d'insertion FINALE (index visuel, 0 = haut). Le pointeur désigne
  // une frontière `b` dans la liste statique ; comme le calque traîné est
  // « soulevé », la frontière est décalée de 1 quand elle se situe sous lui :
  //   slot = b si b ≤ from, sinon b - 1  (from = position actuelle du calque)
  // Aucun déplacement réel si slot === from. L'index pile (0 = bas de pile /
  // arrière-plan) vaut `n - 1 - slot`.

  function startDrag(e: PointerEvent, id: string): void {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button, input')) return
    e.preventDefault()
    dragId = id
    dragPointerId = e.pointerId
    window.addEventListener('pointermove', onDragMove)
    window.addEventListener('pointerup', onDragEnd)
    window.addEventListener('pointercancel', onDragEnd)
    computeDropSlot(e.clientY)
  }

  function onDragMove(e: PointerEvent): void {
    if (dragPointerId !== e.pointerId) return
    computeDropSlot(e.clientY)
  }

  function onDragEnd(e: PointerEvent): void {
    if (dragPointerId !== e.pointerId) return
    window.removeEventListener('pointermove', onDragMove)
    window.removeEventListener('pointerup', onDragEnd)
    window.removeEventListener('pointercancel', onDragEnd)
    dragPointerId = null
    if (dragId !== null && dropSlot !== null) commitReorder(dragId, dropSlot)
    dragId = null
    dropSlot = null
  }

  /** Position d'insertion finale (slot) dérivée de la frontière sous le pointeur. */
  function computeDropSlot(clientY: number): void {
    if (dragId === null || !listEl) {
      dropSlot = null
      return
    }
    const rows = listEl.querySelectorAll<HTMLElement>('.row')
    let boundary = 0
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!.getBoundingClientRect()
      if (clientY >= r.top + r.height / 2) boundary += 1
    }
    const from = nodes.findIndex((n) => n.id === dragId)
    dropSlot = from === -1 ? null : boundary <= from ? boundary : boundary - 1
  }

  /** Position Y (px, relative au contenu de la liste) du trait d'insertion. */
  function dropLineTop(): number | null {
    if (dragId === null || dropSlot === null) return null
    const from = nodes.findIndex((n) => n.id === dragId)
    if (from === -1) return null
    const boundary = dropSlot <= from ? dropSlot : dropSlot + 1
    return LIST_PAD_TOP + boundary * ROW_STEP
  }

  function commitReorder(id: string, slot: number): void {
    const from = nodes.findIndex((n) => n.id === id)
    if (from === -1 || slot === from) return
    reorderNode(id, null, nodes.length - 1 - slot)
  }
</script>

<div class="panel">
  <div class="panel-head">
    <span class="panel-title">Calques</span>
  </div>

  <div bind:this={listEl} class="list">
    {#if nodes.length === 0}
      <p class="empty">Aucun calque</p>
    {:else}
      {#each nodes as node (node.id)}
        <div
          class="row"
          class:row-selected={$selection.has(node.id)}
          class:row-dragging={dragId === node.id}
          role="presentation"
          onpointerdown={(e) => startDrag(e, node.id)}
          animate:flip={{ duration: 160 }}
        >
          {#if renamingId === node.id}
            <input
              class="rename-input"
              bind:value={draft}
              use:focusOnMount
              aria-label="Renommer le calque"
              onblur={commitRename}
              onkeydown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') renamingId = null
              }}
            />
          {:else}
            <span class="row-grip taborder-ignore" aria-hidden="true">
              <Icon name={GripVertical} size={13} strokeWidth={1.7} />
            </span>
            <button
              type="button"
              class="row-select"
              onclick={(e) => handleSelect(e, node.id)}
              ondblclick={() => startRename(node)}
            >
              <span class="row-icon">
                <Icon name={nodeIcon(node.type)} size={14} strokeWidth={1.9} />
              </span>
              <span class="row-name">{node.name}</span>
            </button>
          {/if}
          <Tooltip label={node.locked ? 'Déverrouiller' : 'Verrouiller'} position="left">
            <button
              type="button"
              class="row-action"
              class:action-visible={node.locked}
              aria-label={node.locked ? 'Déverrouiller le calque' : 'Verrouiller le calque'}
              onclick={() => toggleNodeLocked(node.id)}
            >
              <Icon name={node.locked ? Lock : LockOpen} size={14} strokeWidth={1.8} />
            </button>
          </Tooltip>

          <Tooltip label={node.visible ? 'Masquer' : 'Afficher'} position="left">
            <button
              type="button"
              class="row-action"
              aria-label={node.visible ? 'Masquer le calque' : 'Afficher le calque'}
              onclick={() => toggleNodeVisible(node.id)}
            >
              <Icon name={node.visible ? Eye : EyeOff} size={14} strokeWidth={1.8} />
            </button>
          </Tooltip>
        </div>
      {/each}
    {/if}

    {#if dragId !== null && dropSlot !== null}
      <div class="drop-indicator" style="top:{dropLineTop() ?? 0}px;"></div>
    {/if}
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
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
  .list {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding: 4px 6px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    position: relative;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 2px;
    height: 28px;
    padding: 0 4px 0 4px;
    border-radius: var(--radius-xs);
  }
  .row:hover {
    background: var(--hover);
  }
  .row-selected,
  .row-selected:hover {
    background: var(--accent-soft);
  }
  .row-dragging {
    opacity: 0.45;
    outline: 1.5px dashed var(--accent);
    outline-offset: -1px;
  }
  .row-grip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    flex-shrink: 0;
    color: var(--text-tertiary);
    opacity: 0;
    transition: opacity 90ms ease;
  }
  .taborder-ignore {
    pointer-events: none;
  }
  .row:hover .row-grip,
  .row-selected .row-grip,
  .row-dragging .row-grip {
    opacity: 1;
  }
  .row-dragging .row-grip {
    color: var(--accent);
  }
  .row-select {
    display: flex;
    align-items: center;
    gap: 7px;
    flex: 1;
    min-width: 0;
    height: 100%;
    text-align: left;
    color: var(--text);
  }
  .row-icon {
    display: inline-flex;
    align-items: center;
    color: var(--text-tertiary);
    flex-shrink: 0;
  }
  .row-selected .row-icon {
    color: var(--accent);
  }
  .row-name {
    flex: 1;
    font-size: 12.5px;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rename-input {
    flex: 1;
    min-width: 0;
    height: 22px;
    padding: 0 6px;
    font-size: 12.5px;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--accent);
    border-radius: var(--radius-xs);
    outline: none;
  }
  .row-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-xs);
    color: var(--text-tertiary);
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 90ms ease;
  }
  .row:hover .row-action,
  .row-selected .row-action,
  .row-action.action-visible {
    opacity: 1;
  }
  .row-action:hover {
    background: var(--hover);
    color: var(--text);
  }
  .row-selected .row-action {
    color: var(--accent);
  }
  .drop-indicator {
    position: absolute;
    left: 6px;
    right: 6px;
    height: 2px;
    border-radius: 2px;
    background: var(--accent);
    pointer-events: none;
    z-index: 1;
  }
  .empty {
    font-size: 12.5px;
    color: var(--text-tertiary);
    text-align: center;
    padding: 24px 0;
  }
</style>
<script lang="ts">
  import { fly } from 'svelte/transition'

  interface Props {
    placement?: 'top' | 'bottom'
    align?: 'start' | 'end' | 'center'
    offset?: number
    trigger: import('svelte').Snippet<[{ open: boolean; toggle: () => void }]>
    content: import('svelte').Snippet<[{ close: () => void }]>
  }

let { placement = 'bottom', align = 'start', offset = 6, trigger, content }: Props = $props()
let open = $state(false)
let triggerEl = $state<HTMLSpanElement | null>(null)
let contentEl = $state<HTMLDivElement | null>(null)
let pos = $state({ left: 0, top: 0 })

  function reposition(): void {
    if (!triggerEl || !contentEl) return
    const tr = triggerEl.getBoundingClientRect()
    const cr = contentEl.getBoundingClientRect()
    let left =
      align === 'start'
        ? tr.left
        : align === 'end'
          ? tr.left + tr.width - cr.width
          : tr.left + (tr.width - cr.width) / 2
    let top = placement === 'bottom' ? tr.bottom + offset : tr.top - cr.height - offset
    left = Math.max(8, Math.min(left, window.innerWidth - cr.width - 8))
    top = Math.max(8, Math.min(top, window.innerHeight - cr.height - 8))
    pos = { left, top }
  }

  function onDocPointerDown(e: PointerEvent): void {
    if (!triggerEl || !contentEl) return
    const t = e.target as Node
    if (triggerEl.contains(t) || contentEl.contains(t)) return
    open = false
  }

  function onDocKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') open = false
  }

  $effect(() => {
    if (!open) return
    const raf = requestAnimationFrame(reposition)
    document.addEventListener('pointerdown', onDocPointerDown, true)
    document.addEventListener('keydown', onDocKeydown)
    window.addEventListener('resize', reposition)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('pointerdown', onDocPointerDown, true)
      document.removeEventListener('keydown', onDocKeydown)
      window.removeEventListener('resize', reposition)
    }
  })
</script>

<span bind:this={triggerEl} class="popup-trigger">
  {@render trigger({ open, toggle: () => (open = !open) })}
</span>

{#if open}
  <div
    bind:this={contentEl}
    class="popup-content"
    style="left:{pos.left}px; top:{pos.top}px;"
    transition:fly={{ y: 4, duration: 110 }}
  >
    {@render content({ close: () => (open = false) })}
  </div>
{/if}

<style>
  .popup-trigger {
    display: inline-flex;
  }
  .popup-content {
    position: fixed;
    z-index: var(--z-popover);
    background: var(--bg-raised);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-popover);
    min-width: 160px;
    color: var(--text);
  }
</style>
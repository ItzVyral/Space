<script lang="ts">
  import Icon from './Icon.svelte'
  import { untrack } from 'svelte'
  import { ChevronRight } from '@lucide/svelte'

  interface Props {
    title: string
    defaultOpen?: boolean
    action?: import('svelte').Snippet
    children?: import('svelte').Snippet
  }

let { title, defaultOpen = true, action, children }: Props = $props()
let hovering = $state(false)
let open = $state(untrack(() => defaultOpen))

  function onHeadClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('.actions')) return
    open = !open
  }
</script>

<div class="section">
  <button
    type="button"
    class="section-head"
    onclick={onHeadClick}
    onpointerenter={() => (hovering = true)}
    onpointerleave={() => (hovering = false)}
  >
    <span class="chev {open ? 'chev-open' : ''}">
      <Icon name={ChevronRight} size={12} strokeWidth={2.2} />
    </span>
    <span class="title">{title}</span>
    {#if hovering && action}
      <span class="actions no-drag">{@render action()}</span>
    {/if}
  </button>
  {#if open}
    <div class="body">{@render children?.()}</div>
  {/if}
</div>

<style>
  .section {
    border-bottom: 1px solid var(--border);
  }
  .section-head {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    height: 32px;
    padding: 0 8px 0 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.2px;
  }
  .section-head:hover {
    background: var(--hover);
    color: var(--text);
  }
  .chev {
    display: inline-flex;
    align-items: center;
    transition: transform 120ms ease;
    flex-shrink: 0;
    opacity: 0.85;
  }
  .chev-open {
    transform: rotate(90deg);
  }
  .title {
    flex: 1;
    text-align: left;
  }
  .actions {
    display: inline-flex;
    gap: 2px;
  }
  .body {
    padding: 0 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
</style>
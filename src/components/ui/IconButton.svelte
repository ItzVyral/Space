<script lang="ts">
  import type { Component } from 'svelte'
  import Icon from './Icon.svelte'
  import Tooltip from './Tooltip.svelte'

  interface Props {
    icon: Component
    label?: string
    shortcut?: string
    active?: boolean
    disabled?: boolean
    size?: number
    strokeWidth?: number
    class?: string
    onclick?: (e: MouseEvent) => void
    onpointerdown?: (e: PointerEvent) => void
  }

  let {
    icon,
    label,
    shortcut,
    active = false,
    disabled = false,
    size = 16,
    strokeWidth = 1.8,
    class: className = '',
    onclick,
    onpointerdown
  }: Props = $props()
</script>

{#if label}
  <Tooltip {label} {shortcut}>
    <button
      class={['icon-btn', active ? 'icon-btn-active' : '', className].join(' ')}
      {disabled}
      {onclick}
      {onpointerdown}
      type="button"
      aria-pressed={active}
    >
      <Icon name={icon} {size} {strokeWidth} />
    </button>
  </Tooltip>
{:else}
  <button
    class={['icon-btn', active ? 'icon-btn-active' : '', className].join(' ')}
    {disabled}
    {onclick}
    {onpointerdown}
    type="button"
    aria-pressed={active}
  >
    <Icon name={icon} {size} {strokeWidth} />
  </button>
{/if}

<style>
  .icon-btn {
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
    flex-shrink: 0;
  }
  .icon-btn:hover:not(:disabled) {
    background: var(--hover);
    color: var(--text);
  }
  .icon-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .icon-btn-active,
  .icon-btn-active:hover:not(:disabled) {
    background: var(--accent-soft);
    color: var(--accent);
  }
</style>
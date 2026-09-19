<script lang="ts">
  import type { Component } from 'svelte'
  import Icon from './Icon.svelte'

  interface Option {
    value: string
    label?: string
    icon?: Component
  }

  interface Props {
    options: Option[]
    value: string
    onchange: (value: string) => void
    class?: string
  }

  let { options, value, onchange, class: className = '' }: Props = $props()
</script>

<div class="segmented {className}" role="tablist">
  {#each options as option (option.value)}
    <button
      type="button"
      role="tab"
      class="seg-item"
      class:seg-active={option.value === value}
      onclick={() => onchange(option.value)}
    >
      {#if option.icon}<Icon name={option.icon} size={14} strokeWidth={1.9} />{/if}
      {#if option.label}<span>{option.label}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .segmented {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 2px;
  }
  .seg-item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 24px;
    padding: 0 9px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    transition:
      background-color 90ms ease,
      color 90ms ease,
      box-shadow 90ms ease;
  }
  .seg-item:hover {
    color: var(--text);
  }
  .seg-active,
  .seg-active:hover {
    background: var(--bg-raised);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }
</style>
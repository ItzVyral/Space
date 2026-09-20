<script lang="ts">
  import type { Component } from 'svelte'
  import Icon from './Icon.svelte'

  interface Props {
    variant?: 'primary' | 'default' | 'ghost'
    size?: 'sm' | 'md'
    icon?: Component
    label?: string
    disabled?: boolean
    class?: string
    onclick?: (e: MouseEvent) => void
  }

  let {
    variant = 'default',
    size = 'md',
    icon,
    label,
    disabled = false,
    class: className = '',
    onclick
  }: Props = $props()
</script>

<button
  class={['btn', `btn-${variant}`, `btn-${size}`, className].join(' ')}
  {disabled}
  {onclick}
  type="button"
>
  {#if icon}<Icon name={icon} size={size === 'sm' ? 14 : 15} strokeWidth={1.9} />{/if}
  {#if label}<span class="btn-label">{label}</span>{/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border-radius: var(--radius-sm);
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    transition:
      background-color 100ms ease,
      border-color 100ms ease,
      box-shadow 100ms ease;
  }
  .btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .btn-md {
    height: 32px;
    padding: 0 13px;
    font-size: 13px;
  }
  .btn-sm {
    height: 28px;
    padding: 0 10px;
    font-size: 12px;
  }
  .btn-default {
    background: var(--bg);
    border: 1px solid var(--border-strong);
    color: var(--text);
  }
  .btn-default:hover:not(:disabled) {
    background: var(--bg-subtle);
  }
  .btn-ghost {
    background: transparent;
    color: var(--text-secondary);
  }
  .btn-ghost:hover:not(:disabled) {
    background: var(--hover);
    color: var(--text);
  }
  .btn-primary {
    background: var(--accent);
    color: var(--accent-fg);
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }
</style>
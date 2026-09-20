<script lang="ts">
  import type { Component } from 'svelte'
  import Icon from './Icon.svelte'
  import Popup from './Popup.svelte'
  import { Check } from '@lucide/svelte'

  export interface MenuItem {
    label?: string
    icon?: Component
    shortcut?: string
    checked?: boolean
    danger?: boolean
    separator?: boolean
    disabled?: boolean
    onclick?: () => void
  }

  interface Props {
    items: MenuItem[]
    placement?: 'top' | 'bottom'
    align?: 'start' | 'end' | 'center'
    width?: number | string
    trigger: import('svelte').Snippet<[{ toggle: () => void }]>
  }

  let { items, placement = 'bottom', align = 'start', width = 'auto', trigger }: Props = $props()
</script>

{#snippet popupTriggerSnippet({ toggle }: { toggle: () => void })}
  {@render trigger({ toggle })}
{/snippet}

{#snippet menuContent({ close }: { close: () => void })}
  <div class="menu" style="width: {typeof width === 'number' ? `${width}px` : width}">
    {#each items as item, i (i)}
      {#if item.separator}
        <div class="sep"></div>
      {:else}
        <button
          class="menu-item"
          class:danger={item.danger}
          class:menu-checked={item.checked}
          class:disabled={item.disabled}
          disabled={item.disabled}
          onclick={() => {
            item.onclick?.()
            close()
          }}
          type="button"
          role="menuitem"
        >
          <span class="menu-icon">
            {#if item.checked}
              <Icon name={Check} size={14} strokeWidth={2.4} />
            {:else if item.icon}
              <Icon name={item.icon} size={14} strokeWidth={1.9} />
            {:else}
              <span class="icon-slot"></span>
            {/if}
          </span>
          <span class="menu-label">{item.label}</span>
          {#if item.shortcut}<span class="menu-shortcut">{item.shortcut}</span>{/if}
        </button>
      {/if}
    {/each}
  </div>
{/snippet}

<Popup {placement} {align} trigger={popupTriggerSnippet} content={menuContent} />

<style>
  .menu {
    padding: 5px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 28px;
    padding: 0 8px;
    border-radius: var(--radius-xs);
    font-size: 12.5px;
    color: var(--text);
    text-align: left;
  }
  .menu-item:hover:not(.disabled) {
    background: var(--accent);
    color: var(--accent-fg);
  }
  .menu-item.danger:hover:not(.disabled) {
    background: #e5484d;
    color: #fff;
  }
  .menu-item.disabled {
    opacity: 0.45;
    cursor: default;
  }
  .menu-icon {
    width: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .icon-slot {
    width: 16px;
  }
  .menu-label {
    flex: 1;
    white-space: nowrap;
  }
  .menu-shortcut {
    font-size: 11px;
    color: var(--text-tertiary);
  }
  .menu-item:hover .menu-shortcut {
    color: inherit;
    opacity: 0.8;
  }
  .sep {
    height: 1px;
    margin: 4px 6px;
    background: var(--border);
  }
</style>

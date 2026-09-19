<script lang="ts">
  import type { Component } from 'svelte'

  interface Props {
    name: Component
    size?: number
    strokeWidth?: number
    color?: string
    class?: string
  }

  let {
    name,
    size = 16,
    strokeWidth = 1.8,
    color = 'currentColor',
    class: className = ''
  }: Props = $props()

  const Cmp = $derived(name)
</script>

<Cmp {size} {strokeWidth} {color} class={className} aria-hidden="true" />
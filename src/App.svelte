<script lang="ts">
  import { view } from './stores/view.store'
  import HomeView from './components/home/HomeView.svelte'
  import EditorView from './components/editor/EditorView.svelte'
  import { fade } from 'svelte/transition'
</script>

<div class="app">
  {#if $view === 'editor'}
    <div class="screen" in:fade={{ duration: 180 }}>
      <EditorView />
    </div>
  {:else}
    <div class="screen" in:fade={{ duration: 180 }}>
      <HomeView />
    </div>
  {/if}
</div>

<style>
  .app {
    height: 100%;
  }
  .screen {
    height: 100%;
  }
</style>
<script lang="ts">
  import IconButton from '../ui/IconButton.svelte'
  import Divider from '../ui/Divider.svelte'
  import { ChevronLeft, Undo2, Redo2, Sun, Moon } from '@lucide/svelte'
  import { goHome } from '../../stores/view.store'
  import { currentProject, renameProject } from '../../stores/projects.store'
  import { theme, toggleTheme } from '../../stores/theme.store'
  import { historyState, redo, undo } from '../../stores/history.store'

  let editing = $state(false)
  let draft = $state('')

  function startEdit(): void {
    draft = $currentProject?.name ?? ''
    editing = true
  }

  function commitEdit(): void {
    editing = false
    if (!draft.trim()) return
    const id = $currentProject?.id
    if (id) renameProject(id, draft)
  }
</script>

<header class="topbar">
  <div class="group">
    <IconButton label="Retour à l’accueil" icon={ChevronLeft} onclick={goHome} />
    <Divider vertical />
    {#if editing}
      <input
        class="name-input"
        bind:value={draft}
        placeholder="Nom du projet"
        aria-label="Nom du projet"
        onblur={commitEdit}
        onkeydown={(e) => {
          if (e.key === 'Enter') commitEdit()
          if (e.key === 'Escape') editing = false
        }}
      />
    {:else}
      <button type="button" class="name" ondblclick={startEdit} tabindex="0">
        {$currentProject?.name ?? 'Sans titre'}
      </button>
    {/if}
    <span class="dot" aria-hidden="true"></span>
    <span class="mode-badge">Objet</span>
  </div>

  <div class="group center">
    <IconButton
      label="Annuler"
      shortcut="Ctrl+Z"
      icon={Undo2}
      disabled={!$historyState.canUndo}
      onclick={() => undo()}
    />
    <IconButton
      label="Rétablir"
      shortcut="Ctrl+Shift+Z"
      icon={Redo2}
      disabled={!$historyState.canRedo}
      onclick={() => redo()}
    />
  </div>

  <div class="group">
    <IconButton
      label={$theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
      icon={$theme === 'light' ? Moon : Sun}
      onclick={toggleTheme}
    />
    <span class="avatar" aria-hidden="true">{$currentProject?.name?.charAt(0).toUpperCase() ?? 'S'}</span>
  </div>
</header>

<style>
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 46px;
    padding: 0 6px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    -webkit-app-region: drag;
  }
  .group {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    -webkit-app-region: no-drag;
  }
  .group.center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }
  .name {
    max-width: 240px;
    padding: 5px 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    border-radius: var(--radius-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name:hover {
    background: var(--hover);
  }
  .name-input {
    height: 28px;
    padding: 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    background: var(--bg-subtle);
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    outline: none;
  }
  .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--border-strong);
    flex-shrink: 0;
  }
  .mode-badge {
    font-size: 11px;
    color: var(--text-secondary);
    padding: 3px 8px;
    border-radius: var(--radius-xs);
    background: var(--bg-subtle);
    white-space: nowrap;
  }
  .avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent-fg);
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    flex-shrink: 0;
  }
</style>
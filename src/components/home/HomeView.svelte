<script lang="ts">
  import Logo from '../Logo.svelte'
  import Button from '../ui/Button.svelte'
  import Icon from '../ui/Icon.svelte'
  import Menu, { type MenuItem } from '../ui/Menu.svelte'
  import CanvasThumb from './CanvasThumb.svelte'
  import { relativeTime } from '../../lib/color'
  import {
    Clock,
    Star,
    Trash,
    Search,
    Plus,
    ChevronDown,
    Copy,
    Check,
    MoreHorizontal,
    ArrowDownAZ,
    FolderOpen,
    LayoutGrid,
    FileUp
  } from '@lucide/svelte'
  import {
    projects,
    favorites,
    trash,
    openDemoProject,
    createBlankProject,
    duplicateProject,
    toggleFavorite,
    trashProject,
    restoreProject
  } from '../../stores/projects.store'
  import type { DemoProject } from '../../demo/projects'

  const SORTS = [
    { value: 'edited', label: 'Modifié récemment', icon: Clock },
    { value: 'name', label: 'Nom', icon: ArrowDownAZ }
  ]

  type Category = 'recents' | 'favoris' | 'corbeille'

  const NAV: Array<{ id: Category; label: string; icon: typeof Clock }> = [
    { id: 'recents', label: 'Récents', icon: Clock },
    { id: 'favoris', label: 'Favoris', icon: Star },
    { id: 'corbeille', label: 'Corbeille', icon: Trash }
  ]

  let category = $state<Category>('recents')
  let query = $state('')
  let sort = $state('edited')
  let hovered = $state<string | null>(null)

  let pageTitle = $derived(
    category === 'favoris' ? 'Favoris' : category === 'corbeille' ? 'Corbeille' : 'Récents'
  )

  let visibleProjects = $derived.by(() => {
    let list = $projects
    const trashSet = $trash
    if (category === 'favoris') {
      const favs = $favorites
      list = list.filter((p) => favs.has(p.id))
    }
    if (category === 'corbeille') {
      list = list.filter((p) => trashSet.has(p.id))
    } else {
      list = list.filter((p) => !trashSet.has(p.id))
    }
    if (query) {
      const q = query.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q))
    }
    const sorted = [...list]
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    else sorted.sort((a, b) => new Date(b.edited).getTime() - new Date(a.edited).getTime())
    return sorted
  })

  let isStarred = (id: string): boolean => $favorites.has(id)

  function cardMenu(p: DemoProject): MenuItem[] {
    return [
      {
        label: 'Dupliquer',
        icon: Copy,
        onclick: () => duplicateProject(p.id)
      },
      ...(isStarred(p.id)
        ? [{ label: 'Retirer des favoris', icon: Star, onclick: () => toggleFavorite(p.id) }]
        : [{ label: 'Ajouter aux favoris', icon: Star, onclick: () => toggleFavorite(p.id) }]),
      { label: 'Renommer…', icon: FileUp, onclick: () => (rename = p.id) },
      { separator: true },
      {
        label: category === 'corbeille' ? 'Restaurer' : 'Mettre à la corbeille',
        icon: category === 'corbeille' ? Check : Trash,
        danger: category !== 'corbeille',
        onclick: () => (category === 'corbeille' ? restoreProject(p.id) : trashProject(p.id))
      }
    ]
  }

  let rename = $state<string | null>(null)

  let sortLabel = $derived(SORTS.find((s) => s.value === sort)?.label ?? 'Modifié récemment')
</script>

<div class="home">
  <aside class="sidebar">
    <div class="brand">
      <Logo size={30} label="Space" labelSize={15} />
    </div>

    <button type="button" class="workspace">
      <span>Vector Workspace</span>
      <Icon name={ChevronDown} size={14} />
    </button>

    <nav class="nav">
      {#each NAV as item (item.id)}
        <button
          type="button"
          class="nav-item"
          class:nav-active={category === item.id}
          onclick={() => (category = item.id)}
        >
          <Icon name={item.icon} size={16} strokeWidth={1.9} />
          <span class="nav-label">{item.label}</span>
          {#if item.id === 'recents' && $trash.size > 0}
            <span class="nav-count">{visibleProjects.length}</span>
          {:else if item.id === 'corbeille'}
            <span class="nav-count">{$trash.size}</span>
          {/if}
        </button>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <span class="avatar">VV</span>
      <span class="account">
        <span class="account-name">Itzvyral</span>
        <span class="account-kind">Personnel</span>
      </span>
      <Menu
        align="end"
        items={[
          { label: 'Préférences', icon: LayoutGrid },
          { label: 'À propos de Space', icon: FolderOpen },
          { separator: true },
          { label: 'Se déconnecter', icon: Check, danger: true }
        ]}
      >
        {#snippet trigger({ toggle })}
          <button type="button" class="account-more" onclick={() => toggle()} aria-label="Compte">
            <Icon name={MoreHorizontal} size={16} />
          </button>
        {/snippet}
      </Menu>
    </div>
  </aside>

  <main class="main">
    <header class="topbar draggable"></header>

    <div class="scroll">
      <div class="page-head">
        <div>
          <h1 class="page-title">{pageTitle}</h1>
        </div>
        <div class="page-actions no-drag">
          <div class="search">
            <span class="search-icon">
              <Icon name={Search} size={14} />
            </span>
            <input
              bind:value={query}
              placeholder="Rechercher des projets"
              aria-label="Rechercher des projets"
              spellcheck="false"
            />
          </div>

          <Menu
            align="end"
            items={SORTS.map((s) => ({
              label: s.label,
              icon: s.icon,
              checked: sort === s.value,
              onclick: () => (sort = s.value)
            }))}
          >
            {#snippet trigger({ toggle })}
              <button type="button" class="sort" onclick={() => toggle()}>
                <span class="sort-label">Trier :</span>
                <span class="sort-value">{sortLabel}</span>
                <span class="sort-caret">
                  <Icon name={ChevronDown} size={13} />
                </span>
              </button>
            {/snippet}
          </Menu>

          <Button
            variant="primary"
            icon={Plus}
            label="Créer un projet"
            onclick={() => createBlankProject('Sans titre')}
          />
        </div>
      </div>

      <div class="grid">
        {#each visibleProjects as p (p.id)}
          <div
            class="card"
            role="button"
            tabindex="0"
            onclick={() => (category === 'corbeille' ? restoreProject(p.id) : openDemoProject(p.id))}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (category === 'corbeille') restoreProject(p.id)
                else openDemoProject(p.id)
              }
            }}
            onpointerenter={() => (hovered = p.id)}
            onpointerleave={() => (hovered = null)}
          >
            <div class="thumb">
              <CanvasThumb scene={p.createScene} />
              {#if hovered === p.id}
                <div class="thumb-actions">
                  <span
                    role="button"
                    tabindex="0"
                    class="thumb-action"
                    onclick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(p.id)
                    }}
                    onkeydown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation()
                        toggleFavorite(p.id)
                      }
                    }}
                    aria-label="Ajouter aux favoris"
                  >
                    <Icon
                      name={Star}
                      size={15}
                      color={isStarred(p.id) ? '#ffd166' : 'currentColor'}
                    />
                  </span>
                  <Menu align="end" items={cardMenu(p)}>
                    {#snippet trigger({ toggle })}
                      <span
                        role="button"
                        tabindex="0"
                        class="thumb-action"
                        onclick={(e) => {
                          e.stopPropagation()
                          toggle()
                        }}
                        onkeydown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            toggle()
                          }
                        }}
                        aria-label="Options"
                      >
                        <Icon name={MoreHorizontal} size={15} />
                      </span>
                    {/snippet}
                  </Menu>
                </div>
              {/if}
            </div>
            <div class="card-meta">
              <div class="card-name-row">
                {#if rename === p.id}
                  <input
                    class="rename-input"
                    value={p.name}
                    onchange={(e) => {
                      p.name = (e.currentTarget as HTMLInputElement).value
                      rename = null
                    }}
                    onkeydown={(e) => {
                      if (e.key === 'Escape') rename = null
                    }}
                  />
                {:else}
                  <span class="card-name">{p.name}</span>
                {/if}
                {#if category === 'corbeille'}
                  <span class="trash-badge">corbeille</span>
                {/if}
              </div>
              <span class="card-edited">{relativeTime(p.edited)}</span>
            </div>
          </div>
        {/each}

        <div
          class="card card-new"
          role="button"
          tabindex="0"
          onclick={() => createBlankProject('Sans titre')}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              createBlankProject('Sans titre')
            }
          }}
        >
          <div class="thumb-new">
            <Icon name={Plus} size={22} />
            <span>Créer un projet</span>
          </div>
        </div>
      </div>

      {#if visibleProjects.length === 0}
        <div class="empty">
          <div class="empty-icon">
            <Icon name={category === 'corbeille' ? Trash : Star} size={26} />
          </div>
          <p class="empty-title">
            {category === 'corbeille' ? 'La corbeille est vide' : 'Aucun projet'}
          </p>
          <p class="empty-sub">
            {category === 'corbeille'
              ? 'Les projets supprimés apparaîtront ici.'
              : 'Créez un projet pour commencer à dessiner.'}
          </p>
        </div>
      {/if}
    </div>
  </main>
</div>

<style>
  .home {
    display: flex;
    height: 100%;
    background: var(--bg);
  }

  .sidebar {
    width: 248px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    padding: 14px 10px 10px;
    border-right: 1px solid var(--border);
    background: var(--bg);
  }
  .brand {
    padding: 4px 8px 14px;
  }
  .workspace {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 34px;
    margin: 0 4px 10px;
    padding: 0 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    background: var(--hover);
    border-radius: var(--radius-sm);
    transition: background-color 90ms ease;
  }
  .workspace:hover {
    background: var(--active);
  }
  .nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 34px;
    padding: 0 10px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--text-secondary);
    transition:
      background-color 90ms ease,
      color 90ms ease;
  }
  .nav-item:hover {
    background: var(--hover);
    color: var(--text);
  }
  .nav-active,
  .nav-active:hover {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
  .nav-label {
    flex: 1;
    text-align: left;
  }
  .nav-count {
    font-size: 11px;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }
  .nav-active .nav-count {
    color: var(--accent);
  }

  .sidebar-footer {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 8px 0;
    border-top: 1px solid var(--border);
  }
  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0d99ff, #7c3aed);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .account {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }
  .account-name {
    font-size: 12.5px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .account-kind {
    font-size: 11px;
    color: var(--text-tertiary);
  }
  .account-more {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
  }
  .account-more:hover {
    background: var(--hover);
    color: var(--text);
  }

  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .topbar {
    height: 44px;
    flex-shrink: 0;
  }
  .scroll {
    flex: 1;
    overflow-y: auto;
    padding: 8px 32px 48px;
  }

  .page-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 0 20px;
  }
  .page-title {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.4px;
  }
  .page-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 250px;
    height: 32px;
    padding: 0 10px;
    background: var(--bg);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    transition: border-color 100ms ease;
  }
  .search:focus-within {
    border-color: var(--accent);
  }
  .search-icon {
    color: var(--text-tertiary);
    flex-shrink: 0;
  }
  .search input {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: var(--text);
    background: transparent;
  }
  .search input::placeholder {
    color: var(--text-tertiary);
  }

  .sort {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 10px;
    font-size: 13px;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
  }
  .sort:hover {
    background: var(--hover);
    color: var(--text);
  }
  .sort-label {
    color: var(--text-tertiary);
  }
  .sort-value {
    font-weight: 500;
    color: var(--text);
  }
  .sort-caret {
    color: var(--text-tertiary);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 18px;
  }

  .card {
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--bg);
    border: 1px solid var(--border);
    cursor: pointer;
    transition:
      border-color 120ms ease,
      box-shadow 120ms ease,
      transform 100ms ease;
  }
  .card:hover,
  .card:focus-visible {
    border-color: var(--accent);
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }
  .thumb {
    position: relative;
    aspect-ratio: 17 / 10;
    background: var(--bg-subtle);
    overflow: hidden;
  }
  .thumb-actions {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    gap: 6px;
  }
  .thumb-action {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
    background: var(--bg-raised);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition:
      background-color 90ms ease,
      color 90ms ease;
  }
  .thumb-action:hover {
    background: var(--hover);
    color: var(--text);
  }
  .card-meta {
    padding: 10px 12px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .card-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .card-name {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rename-input {
    width: 100%;
    font-size: 13px;
    font-weight: 600;
    padding: 2px 4px;
    border: 1px solid var(--accent);
    border-radius: var(--radius-xs);
    background: var(--bg);
    color: var(--text);
  }
  .trash-badge {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: var(--text-tertiary);
    border: 1px solid var(--border-strong);
    border-radius: 99px;
    padding: 1px 6px;
  }
  .card-edited {
    font-size: 12px;
    color: var(--text-tertiary);
  }

  .card-new {
    border: 1.5px dashed var(--border-strong);
    background: transparent;
    box-shadow: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card-new:hover {
    border-color: var(--accent);
    box-shadow: none;
  }
  .thumb-new {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--text-tertiary);
    font-size: 13px;
    font-weight: 500;
    padding: 40px 0;
  }
  .card-new:hover .thumb-new {
    color: var(--accent);
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 90px 0;
    color: var(--text-tertiary);
  }
  .empty-icon {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    background: var(--hover);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }
  .empty-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-secondary);
  }
  .empty-sub {
    font-size: 13px;
  }
</style>
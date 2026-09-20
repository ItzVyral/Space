<script lang="ts">
  import TopBar from './TopBar.svelte'
  import ToolbarOutils from './ToolbarOutils.svelte'
  import LayersPanel from '../panels/LayersPanel.svelte'
  import AssetsPanel from '../panels/AssetsPanel.svelte'
  import DesignPanel from '../panels/DesignPanel.svelte'
  import CanvasStage from '../canvas/CanvasStage.svelte'
  import Tabs from '../ui/Tabs.svelte'
  import { clearSelection, selectOnly, selection } from '../../stores/selection.store'
  import { removeNodes, sceneGraph } from '../../stores/scene-actions'
  import { redo, undo } from '../../stores/history.store'
  import { isToolEnabled, setTool, toolFromShortcut } from '../../stores/tool.store'

  type SidebarTab = 'calques' | 'assets'

  let sidebarTab = $state<SidebarTab>('calques')

  function isTypingTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null
    if (!el) return false
    return (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'SELECT' ||
      el.isContentEditable
    )
  }

  function selectAll(): void {
    const ids: string[] = []
    $sceneGraph.walk((node) => {
      if (node.visible && !node.locked) ids.push(node.id)
    })
    selectOnly(ids)
  }

  function deleteSelection(): void {
    if ($selection.size === 0) return
    removeNodes([...$selection])
    clearSelection()
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (isTypingTarget(e.target)) return
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase()
      if (key === 'a') {
        e.preventDefault()
        selectAll()
      } else if (key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (key === 'y') {
        e.preventDefault()
        redo()
      }
      return
    }
    const tool = toolFromShortcut(e.key)
    if (tool && isToolEnabled(tool)) {
      e.preventDefault()
      setTool(tool)
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if ($selection.size > 0) {
        e.preventDefault()
        deleteSelection()
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="editor">
  <TopBar />
  <div class="workspace">
    <ToolbarOutils />
    <aside class="sidebar">
      <Tabs
        tabs={[
          { id: 'calques', label: 'Calques' },
          { id: 'assets', label: 'Assets' }
        ]}
        value={sidebarTab}
        onchange={(tab) => (sidebarTab = tab as SidebarTab)}
      />
      <div class="sidebar-body">
        {#if sidebarTab === 'calques'}
          <LayersPanel />
        {:else}
          <AssetsPanel />
        {/if}
      </div>
    </aside>
    <main class="stage">
      <CanvasStage />
    </main>
    <DesignPanel />
  </div>
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .workspace {
    flex: 1;
    min-height: 0;
    display: flex;
    position: relative;
  }
  .sidebar {
    display: flex;
    flex-direction: column;
    width: 208px;
    flex-shrink: 0;
    border-right: 1px solid var(--border);
    background: var(--surface);
  }
  .sidebar-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .stage {
    flex: 1;
    min-width: 0;
    position: relative;
    background: var(--canvas);
  }
</style>

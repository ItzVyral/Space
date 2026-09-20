import { writable } from 'svelte/store'
import { DEMO_PROJECTS, findDemoProject, type DemoProject } from '../demo/projects'
import { SceneGraph } from '../core/scene/SceneGraph'
import { defaultViewport } from '../core/viewport/Viewport'
import { sceneGraph } from './scene.store'
import { clearHistory } from './history.store'
import { selection } from './selection.store'
import { viewport } from './viewport.store'
import { goEditor } from './view.store'

export const projects = writable<DemoProject[]>(DEMO_PROJECTS)
export const currentProject = writable<DemoProject | null>(null)
export const favorites = writable<Set<string>>(new Set())
export const trash = writable<Set<string>>(new Set())

export function openDemoProject(id: string): void {
  const project = findDemoProject(id)
  if (!project) return
  currentProject.set(project)
  loadScene(project.createScene())
}

export function createBlankProject(name: string): void {
  const id = `project-${Math.random().toString(36).slice(2, 9)}`
  const project: DemoProject = {
    id,
    name,
    edited: new Date().toISOString(),
    createScene: () => new SceneGraph()
  }
  projects.update((list) => [project, ...list])
  currentProject.set(project)
  loadScene(project.createScene())
}

export function duplicateProject(id: string): void {
  const source = findDemoProject(id)
  if (!source) return
  const copy: DemoProject = {
    id: `copy-${Math.random().toString(36).slice(2, 9)}`,
    name: `${source.name} — copie`,
    edited: new Date().toISOString(),
    createScene: () => source.createScene()
  }
  projects.update((list) => [copy, ...list])
}

function loadScene(scene: SceneGraph): void {
  clearHistory()
  sceneGraph.set(scene)
  selection.set(new Set())
  viewport.set(defaultViewport())
  goEditor()
}

export function toggleFavorite(id: string): void {
  favorites.update((set) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}

export function renameProject(id: string, name: string): void {
  const trimmed = name.trim()
  if (!trimmed) return
  projects.update((list) => list.map((p) => (p.id === id ? { ...p, name: trimmed } : p)))
  currentProject.update((p) => (p && p.id === id ? { ...p, name: trimmed } : p))
}

export function trashProject(id: string): void {
  trash.update((set) => new Set(set).add(id))
}

export function restoreProject(id: string): void {
  trash.update((set) => {
    const next = new Set(set)
    next.delete(id)
    return next
  })
}
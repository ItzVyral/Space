import { writable } from 'svelte/store'
import { defaultViewport } from '../core/viewport/Viewport'

export const viewport = writable(defaultViewport())
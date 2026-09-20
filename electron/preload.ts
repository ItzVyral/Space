import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld(
  'space',
  Object.freeze({
    platform: process.platform,
    versions: Object.freeze({
      electron: process.versions.electron ?? '',
      node: process.versions.node ?? ''
    })
  })
)
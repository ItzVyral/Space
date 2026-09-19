export {}

declare global {
  interface Window {
    space: {
      readonly platform: string
      readonly versions: {
        readonly electron: string
        readonly node: string
      }
    }
  }
}
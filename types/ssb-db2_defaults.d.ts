declare module 'ssb-db2/defaults' {
  export function newLogPath(dir: string): string
  export function indexesPath(dir: string): string
  export function jitIndexesPath(dir: string): string
}

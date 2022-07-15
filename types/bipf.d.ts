// Generated and adapted from
// `tsc node_modules/ssb-db2/indexes/plugin.js -d --emitDeclarationOnly --allowJs`

declare module 'bipf' {
  export function allocAndEncode(obj: any): Buffer
  export function seekKey2(
    buf: Buffer,
    start: number,
    target: Buffer,
    target_start: number
  ): number
  export function decode(buf: Buffer, start: number): any
}

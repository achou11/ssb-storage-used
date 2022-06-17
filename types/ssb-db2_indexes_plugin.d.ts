// Generated and adapted from
// `tsc node_modules/ssb-db2/indexes/plugin.js -d --emitDeclarationOnly --allowJs`

declare module 'ssb-db2/indexes/plugin' {
  export = Plugin

  interface BipfRecord {
    offset: number
    value: Buffer
  }

  class Plugin {
    constructor(
      log: any,
      dir: any,
      name: string,
      version: any,
      keyEncoding: any,
      valueEncoding: any
    )
    log: any
    name: string
    private _keyEncoding: any
    private _valueEncoding: any
    level: Level.Level
    offset: number
    private _stateLoaded: DeferredPromise.DeferredPromise<any>
    batch: any[]
    private _flush: (overwriting: any, cb: any) => any
    onFlush: (cb2: any) => any
    flush: any
    forcedFlush: any
    onRecord: (record: BipfRecord, isLive: any, pValue: number) => void
    abstract reset?: (cb: any) => void
    abstract onLoaded?: (cb: () => DeferredPromise.DeferredPromise<any>) => void
    get stateLoaded(): Promise<any>
    get keyEncoding(): any
    get valueEncoding(): any
    close(cb: any): void
    processRecord(record: BipfRecord, seq: number, pValue: number): void
    indexesContent(): boolean
  }
  import DeferredPromise = require('p-defer')
  import Level = require('level')
}

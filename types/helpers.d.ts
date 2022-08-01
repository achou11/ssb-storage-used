export interface BipfRecord {
  offset: number
  value: Buffer
}

export interface CB<T> {
  (err: any, val?: T): void
}

export interface LogStats {
  totalBytes: number
  totalCount: number
  deletedBytes: number
  deletedCount: number
}

export interface SSB {
  db?: {
    getIndex: CallableFunction
    onDrain: CallableFunction
    registerIndex: CallableFunction
    getLog: () => {
      stats: (cb: CB<LogStats>) => void
    }
  }
}

export interface SSBConfig {
  path: string
}

export type StatsPromiseFulfilledResults = [
  PromiseFulfilledResult<number>,
  PromiseFulfilledResult<number>,
  PromiseFulfilledResult<number>,
  PromiseFulfilledResult<number>,
  PromiseFulfilledResult<LogStats>
]

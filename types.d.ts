export interface BipfRecord {
  offset: number
  value: Buffer
}

export interface CB<T> {
  (err: any, val?: T): void
}

export interface SSB {
  db?: {
    getIndex: CallableFunction
    onDrain: CallableFunction
    registerIndex: CallableFunction
  }
}

export interface SSBConfig {
  path: string
}

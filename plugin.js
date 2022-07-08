const fs = require('fs/promises')
const bipf = require('bipf')
const clarify = require('clarify-error')
const pullLevel = require('pull-level')
const pull = require('pull-stream')
const { newLogPath, indexesPath } = require('ssb-db2/defaults')
const Plugin = require('ssb-db2/indexes/plugin')
const trammel = require('trammel')

const TRAMMEL_OPTIONS = { type: 'raw' }

const BIPF_AUTHOR = bipf.allocAndEncode('author')

// See https://github.com/achou11/ssb-storage-used/issues/4 for context
const PREFIX_FACTOR = 1 / Math.log2(1.1)

/**
 * @param {string} logPath
 * @returns {Promise<number>}
 */
async function getLogFileSize(logPath) {
  const { size } = await fs.stat(logPath)
  return size
}

// Index of feedId to storage used in bytes
module.exports = class StorageUsed extends Plugin {
  /**
   *
   * @param {*} log
   * @param {*} dir
   */
  constructor(log, dir) {
    super(log, dir, 'storageUsed', 1, 'json', 'json')

    /**
     * Map of feedId to bytes stored
     * @type {Map<string, number>}
     */
    this.bytesStored = new Map()

    /**
     * Map of feed id to the calculated prefix used for level key
     * @type {Map<string, string>}
     */
    this.feedIdToPrefix = new Map()

    /** @type {string} */
    this.db2LogPath = newLogPath(dir)

    /** @type {string} */
    this.db2IndexesPath = indexesPath(dir)
  }

  // See https://github.com/Microsoft/TypeScript/issues/27965 for relevant details
  // @ts-expect-error
  onLoaded(cb) {
    pull(
      pullLevel.read(this.level, {
        gt: '\x00',
        keyEncoding: this.keyEncoding,
        valueEncoding: this.valueEncoding,
        keys: true,
      }),
      pull.drain(
        (data) => {
          this.bytesStored.set(data.key, data.value)
        },
        (err) => {
          if (err && err !== true) {
            cb(clarify(err, 'StorageUsed.onLoaded() failed'))
          } else cb()
        }
      )
    )
  }

  // See https://github.com/Microsoft/TypeScript/issues/27965 for relevant details
  // @ts-expect-error
  reset() {
    this.bytesStored.clear()
    this.feedIdToPrefix.clear()
  }

  /**
   * @param {import('./types').BipfRecord} record
   * @param {number} seq
   * @param {number} pValue
   */
  processRecord(record, seq, pValue) {
    const buf = record.value
    const pAuthor = bipf.seekKey2(buf, pValue, BIPF_AUTHOR, 0)
    const author = bipf.decode(buf, pAuthor)

    const size = this._calculateBytesStored(author, buf.length)
    const prefix = this._calculatePrefix(size)
    const key = prefix + author

    const prevPrefix = this.feedIdToPrefix.get(author)
    const prefixHasChanged = prevPrefix !== prefix

    if (prevPrefix && prefixHasChanged) {
      this.batch.push({
        type: 'del',
        key: prevPrefix + author,
      })
    }

    this.batch.push({
      type: 'put',
      key,
      value: size,
    })

    // Update in-memory maps
    this.bytesStored.set(author, size)
    if (prefixHasChanged) this.feedIdToPrefix.set(author, prefix)
  }

  /**
   * @param {string} feedId
   * @returns {number}
   */
  getBytesStored(feedId) {
    return this.bytesStored.get(feedId) || 0
  }

  /**
   * @param {string} blobsPath
   * @param {import('./types').CB<any>} cb
   */
  async getStats(blobsPath, cb) {
    /** @type {[PromiseSettledResult<number>, PromiseSettledResult<number>, PromiseSettledResult<number>]} */
    const results = await Promise.allSettled([
      trammel(blobsPath, TRAMMEL_OPTIONS),
      trammel(this.db2IndexesPath, TRAMMEL_OPTIONS),
      getLogFileSize(this.db2LogPath),
    ])

    const rejected = /** @type {PromiseRejectedResult[]} */ (
      results.filter((r) => r.status === 'rejected')
    )

    if (rejected.length > 0) {
      rejected.forEach((r) => console.error(r.reason))
      // TODO: What error do we send here?
      cb(new Error('Issue getting results'))
      return
    }

    const [blobsResult, indexesResult, logResult] =
      /** @type {[PromiseFulfilledResult<number>, PromiseFulfilledResult<number>, PromiseFulfilledResult<number>]} */ (
        results
      )

    cb(null, {
      blobs: blobsResult.value,
      indexes: indexesResult.value,
      log: logResult.value,
    })
  }

  stream() {
    const { level } = this
    let prefix = 0
    return (errOrEnd, cb) => {
      if (errOrEnd) return cb(errOrEnd)
      if (++prefix >= 100) return cb(true)

      const stringPrefix = this._createPrefixString(prefix)

      pull(
        pullLevel.read(level, {
          gte: stringPrefix,
          lte: stringPrefix + '~',
          keys: true,
          values: true,
        }),
        pull.collect((err, items) => {
          items.sort((a, b) => {
            const valueA = a.value
            const valueB = b.value
            return valueB - valueA
          })
          cb(null, items)
        })
      )
    }
  }

  /**
   * @param {string} author
   * @param {number} bufferLength
   * @returns {number}
   */
  _calculateBytesStored(author, bufferLength) {
    const newTotal = (this.bytesStored.get(author) || 0) + bufferLength
    return newTotal
  }

  /**
   * The prefix is a two digit number represented as a string that represents the following:
   * Prefix N means the feed's bytes used is less than 2^(100-N) KB and more than 2^(99-N) KB
   *
   * @param {number} bufferLength
   * @returns {string}
   */
  _calculatePrefix(bufferLength) {
    // If actual total is less than 1kb, round up to 1kb
    const kbTotal = Math.max(bufferLength, 1024) / 1024
    const prefix = 99 - Math.floor(Math.log2(kbTotal) * PREFIX_FACTOR)
    return this._createPrefixString(prefix)
  }

  /**
   * @param {number} prefix a one or two digit number
   * @returns {string}
   */
  _createPrefixString(prefix) {
    return prefix < 10 ? `0${prefix}` : `${prefix}`
  }
}

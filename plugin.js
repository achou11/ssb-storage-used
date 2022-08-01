const bipf = require('bipf')
const clarify = require('clarify-error')
// @ts-expect-error
const pullLevel = require('pull-level')
const pull = require('pull-stream')
const Plugin = require('ssb-db2/indexes/plugin')

const BIPF_AUTHOR = bipf.allocAndEncode('author')

// See https://github.com/achou11/ssb-storage-used/issues/4 for context
const PREFIX_FACTOR = 1 / Math.log2(1.1)

/**
 * @param {string | number} value
 * @returns {number}
 */
function toInt(value) {
  if (typeof value === 'number') return value
  return parseInt(value, 10)
}

// Index of feedId to storage used in bytes
module.exports = class StorageUsed extends Plugin {
  /**
   *
   * @param {*} log
   * @param {*} dir
   */
  constructor(log, dir) {
    super(log, dir, 'storageUsed', 1, undefined, undefined)

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
  }

  // See https://github.com/Microsoft/TypeScript/issues/27965 for relevant details
  // @ts-expect-error
  onLoaded(cb) {
    const META = '\x00'
    pull(
      pullLevel.read(this.level, { gt: META }),
      pull.drain(
        ({ key, value }) => {
          const [prefix, author] = this._unpackKey(key)
          this.bytesStored.set(author, toInt(value))
          this.feedIdToPrefix.set(author, prefix)
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
   * @param {string} prefix
   * @param {string} author
   * @returns
   */
  _packKey(prefix, author) {
    return prefix + author
  }

  /**
   * @param {string} key
   * @returns {[string, string]}
   */
  _unpackKey(key) {
    const prefix = key.slice(0, 2)
    const author = key.slice(2)
    return [prefix, author]
  }

  /**
   * <PREFIX><AUTHOR>:string => bytes:number
   *
   * @param {import('./types/helpers').BipfRecord} record
   * @param {number} seq
   * @param {number} pValue
   */
  processRecord(record, seq, pValue) {
    const buf = record.value
    const pAuthor = bipf.seekKey2(buf, pValue, BIPF_AUTHOR, 0)
    const author = bipf.decode(buf, pAuthor)

    const size = this._calculateBytesStored(author, buf.length)
    const prefix = this._calculatePrefix(size)
    const key = this._packKey(prefix, author)

    const prevPrefix = this.feedIdToPrefix.get(author)
    const prefixHasChanged = prevPrefix !== prefix

    if (prevPrefix && prefixHasChanged) {
      const prevKey = this._packKey(prevPrefix, author)
      this.batch.push({
        type: 'del',
        key: prevKey,
      })
    }

    this.batch.push({
      type: 'put',
      key,
      value: size,
    })

    // Update in-memory maps
    this.bytesStored.set(author, size)
    if (!this.feedIdToPrefix.has(author) || prefixHasChanged) {
      this.feedIdToPrefix.set(author, prefix)
    }
  }

  /**
   * @param {string} feedId
   * @returns {number}
   */
  getBytesStored(feedId) {
    return this.bytesStored.get(feedId) || 0
  }

  /**
   * @returns {pull.Source<[string, number]>}
   */
  stream() {
    const self = this
    let prefix = 0

    /**
     * @param {*} errOrEnd
     * @param {import('./types/helpers').CB<*>} cb
     */
    function chunkedStream(errOrEnd, cb) {
      if (errOrEnd) return cb(errOrEnd)
      if (prefix >= 100) return cb(true)

      const stringPrefix = self._createPrefixString(prefix)

      pull(
        pullLevel.read(self.level, {
          gte: stringPrefix,
          lte: stringPrefix + '~',
          keys: true,
          values: true,
        }),
        pull.collect((err, chunk) => {
          prefix++
          cb(
            null,
            chunk
              .map((c) => {
                const feedId = self._unpackKey(c.key)[1]
                const bytes = toInt(c.value)
                return /** @type {const} */ ([feedId, bytes])
              })
              .sort((a, b) => b[1] - a[1])
          )
        })
      )
    }

    // @ts-ignore
    return pull(
      chunkedStream,
      pull.filter((chunk) => chunk.length > 0),
      pull.map(pull.values),
      pull.flatten()
    )
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
    const prefix = Math.max(
      0,
      99 - Math.floor(Math.log2(kbTotal) * PREFIX_FACTOR)
    )
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

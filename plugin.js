const bipf = require('bipf')
const clarify = require('clarify-error')
const pl = require('pull-level')
const pull = require('pull-stream')
const Plugin = require('ssb-db2/indexes/plugin')

const BIPF_AUTHOR = bipf.allocAndEncode('author')

// Index of feedId to storage used in bytes
class StorageUsed extends Plugin {
  /**
   *
   * @param {*} log
   * @param {*} dir
   */
  constructor(log, dir) {
    super(log, dir, 'storageUsed', 1, 'json', 'json')

    /**
     * @type {Map<string, number>}
     */
    this.bytesStored = new Map()
  }

  // TODO: TS throws a type error (TS2425) if this isn't an arrow function
  onLoaded = (cb) => {
    pull(
      pl.read(this.level, {
        gte: '',
        lte: undefined,
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

  // TODO: TS throws a type error (TS2425) if this isn't an arrow function
  reset = () => {
    this.bytesStored.clear()
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

    this.batch.push({
      type: 'put',
      key: author,
      value: this.updateBytesStored(author, buf.length),
    })
  }

  /**
   *
   * @param {string} author
   * @param {number} bufferLength
   */
  updateBytesStored(author, bufferLength) {
    const newTotal = this.bytesStored.get(author) || 0 + bufferLength
    this.bytesStored.set(author, newTotal)
    return newTotal
  }

  /**
   * @param {string} feedId
   */
  getBytesStored(feedId) {
    return this.bytesStored.get(feedId) || 0
  }

  /**
   *
   * @param {string} feedId
   * @returns {*}
   */
  getLiveBytesStored(feedId) {
    return pl.read(this.level, {
      gte: feedId,
      lte: feedId,
      keyEncoding: this.keyEncoding,
      valueEncoding: this.valueEncoding,
      keys: false,
      live: true,
      old: false,
    })
  }
}

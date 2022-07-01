const bipf = require('bipf')
const clarify = require('clarify-error')
const pl = require('pull-level')
const pull = require('pull-stream')
const Plugin = require('ssb-db2/indexes/plugin')

const BIPF_AUTHOR = bipf.allocAndEncode('author')

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
     * @type {Map<string, number>}
     */
    this.bytesStored = new Map()
  }

  // To appease:
  //  > TS2653: Non-abstract class expression does not implement inherited
  //  > abstract member 'onLoaded' from class 'Plugin'.
  onLoaded = undefined

  // See https://github.com/Microsoft/TypeScript/issues/27965 for relevant details
  // @ts-ignore
  reset() {
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
      value: this._updateBytesStored(author, buf.length),
    })
  }

  /**
   * @param {string} author
   * @param {number} bufferLength
   */
  _updateBytesStored(author, bufferLength) {
    const newTotal = (this.bytesStored.get(author) || 0) + bufferLength
    this.bytesStored.set(author, newTotal)
    return newTotal
  }

  /**
   * @param {string} feedId
   */
  getBytesStored(feedId) {
    return this.bytesStored.get(feedId) || 0
  }
}

const path = require('path')
const pull = require('pull-stream')

const IndexPlugin = require('./plugin')

/**
 * @typedef {import('./types').SSB} SSB
 */

/**
 * @typedef {import('./types').SSBConfig} SSBConfig
 */

module.exports = {
  name: 'storageUsed',
  version: '1.0.0',
  manifest: {
    getBytesStored: 'async',
    stats: 'async',
    stream: 'source',
  },
  permissions: {
    master: {
      allow: ['getBytesUsed', 'stream'],
    },
  },
  /**
   * @param {Required<SSB>} ssb
   * @param {SSBConfig} config
   */
  init(ssb, config) {
    const blobsPath = path.join(config.path, 'blobs')

    ssb.db.registerIndex(IndexPlugin)

    /**
     * Get the storage capacity used for a specfic feed id
     * @param {string} feedId
     * @param {import('./types').CB<any>} cb
     */
    function getBytesStored(feedId, cb) {
      /** @type {IndexPlugin} */
      const indexPlugin = ssb.db.getIndex('storageUsed')
      ssb.db.onDrain('storageUsed', () => {
        cb(null, indexPlugin.getBytesStored(feedId))
      })
    }

    /**
     * @param {import('./types').CB<any>} cb
     */
    function stats(cb) {
      /** @type {IndexPlugin} */
      const indexPlugin = ssb.db.getIndex('storageUsed')
      ssb.db.onDrain('storageUsed', () => {
        indexPlugin.getStats(blobsPath, cb)
      })
    }

    function stream() {
      /** @type {IndexPlugin} */
      const indexPlugin = ssb.db.getIndex('storageUsed')
      return indexPlugin.stream()
    }

    return { getBytesStored, stats, stream }
  },
}

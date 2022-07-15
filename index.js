const path = require('path')
const pull = require('pull-stream')

const getStats = require('./stats')
const IndexPlugin = require('./plugin')

/**
 * @typedef {import('./types/helpers').SSB} SSB
 */

/**
 * @typedef {import('./types/helpers').SSBConfig} SSBConfig
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
    ssb.db.registerIndex(IndexPlugin)

    /**
     * Get the storage capacity used for a specfic feed id
     * @param {string} feedId
     * @param {import('./types/helpers').CB<*>} cb
     */
    function getBytesStored(feedId, cb) {
      /** @type {IndexPlugin} */
      const indexPlugin = ssb.db.getIndex('storageUsed')
      ssb.db.onDrain('storageUsed', () => {
        cb(null, indexPlugin.getBytesStored(feedId))
      })
    }

    /**
     * @param {import('./types/helpers').CB<*>} cb
     */
    function stats(cb) {
      ssb.db.onDrain('storageUsed', () => {
        getStats(config.path, cb)
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

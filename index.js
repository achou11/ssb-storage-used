const pull = require('pull-stream')

const IndexPlugin = require('./plugin')

/**
 * @typedef {import('./types').SSB} SSB
 */

module.exports = {
  name: 'storageUsed',
  version: '1.0.0',
  manifest: {
    getBytesStored: 'async',
    stream: 'source',
  },
  permissions: {
    master: {
      allow: ['getBytesUsed', 'stream'],
    },
  },
  /**
   * @param {Required<SSB>} ssb
   */
  init(ssb) {
    ssb.db.registerIndex(IndexPlugin)

    /**
     * Get the storage capacity used for a specfic feed id
     * @param {string} feedId
     * @param {import('./types').CB<any>} cb
     */
    function getBytesStored(feedId, cb) {
      const indexPlugin = ssb.db.getIndex('storageUsed')
      ssb.db.onDrain('storageUsed', () => {
        cb(null, indexPlugin.getBytesStored(feedId))
      })
    }

    function stream() {
      const indexPlugin = ssb.db.getIndex('storageUsed')
      return indexPlugin.stream()
    }

    return { getBytesStored, stream }
  },
}

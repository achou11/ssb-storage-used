const pull = require('pull-stream')
const pullAsync = require('pull-async')
const cat = require('pull-cat')

const IndexPlugin = require('./plugin')

/**
 * @typedef {import('./types').SSB} SSB
 */

module.exports = {
  name: 'storageUsed',
  version: '1.0.0',
  manifest: {
    get: 'async',
    stream: 'source',
  },
  permissions: {
    master: {
      allow: ['get', 'stream'],
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
    function get(feedId, cb) {
      const indexPlugin = ssb.db.getIndex('storageUsed')
      ssb.db.onDrain('storageUsed', () => {
        cb(null, indexPlugin.getBytesStored(feedId))
      })
    }

    /**
     * @param {string} feedId
     * @returns {*}
     */
    function stream(feedId) {
      const indexPlugin = ssb.db.getIndex('storageUsed')
      return cat([
        // First deliver latest field value
        pull(
          pullAsync((/** @type {import('./types').CB<any>}*/ cb) => {
            get(feedId, cb)
          })
        ),
        // Then deliver live field values
        indexPlugin.getLiveBytesStored(feedId),
      ])
    }

    return { get, stream }
  },
}

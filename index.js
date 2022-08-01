const pull = require('pull-stream')
// @ts-ignore
const deferred = require('pull-defer')

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
     * Determine how many bytes a feed is using on the log, and (on average)
     * how many bytes it is using for indexes, and add them up.
     * @param {number} logBytes
     * @param {*} info
     * @returns {number}
     */
    function sumLogAndIndexes(logBytes, info) {
      const totalLogBytes = info.logUsedBytes
      const proportion = logBytes / totalLogBytes
      const indexesBytes = proportion * (info.indexes + info.jitIndexes)
      return logBytes + indexesBytes
    }

    /**
     * Get the storage capacity used for a specfic feed id
     * @param {string} feedId
     * @param {import('./types/helpers').CB<*>} cb
     */
    function getBytesStored(feedId, cb) {
      /** @type {IndexPlugin} */
      const indexPlugin = ssb.db.getIndex('storageUsed')
      stats((err, info) => {
        if (err) return cb(err)
        ssb.db.onDrain('storageUsed', () => {
          const logBytes = indexPlugin.bytesStored.get(feedId)
          if (logBytes == null) return cb(null, 0)
          cb(null, sumLogAndIndexes(logBytes, info))
        })
      })
    }

    /**
     * @param {import('./types/helpers').CB<*>} cb
     */
    function stats(cb) {
      getStats(ssb, config.path, cb)
    }

    function stream() {
      /** @type {IndexPlugin} */
      const indexPlugin = ssb.db.getIndex('storageUsed')
      const source = deferred.source()
      stats((err, info) => {
        source.resolve(
          err
            ? pull.error(err)
            : pull(
                indexPlugin.stream(),
                pull.map(([feedId, logBytes]) => [
                  feedId,
                  sumLogAndIndexes(logBytes, info),
                ])
              )
        )
      })
      return source
    }

    return { getBytesStored, stats, stream }
  },
}

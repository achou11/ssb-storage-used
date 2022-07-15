const fs = require('fs')
const path = require('path')
const clarify = require('clarify-error')
const trammel = require('trammel')
const { newLogPath, indexesPath, jitIndexesPath } = require('ssb-db2/defaults')

const TRAMMEL_OPTIONS = /** @type {const} */ ({ type: 'raw' })

/**
 * @typedef {import('./types/helpers').StatsPromiseFulfilledResults} StatsPromiseFulfilledResults
 */

/**
 * @param {string} dir
 * @param {import('./types/helpers').CB<*>} cb
 */
function getStats(dir, cb) {
  const blobsPath = path.join(dir, 'blobs')
  const db2LogPath = newLogPath(dir)
  const db2IndexesPath = indexesPath(dir)
  const db2JitIndexesPath = jitIndexesPath(dir)

  Promise.allSettled([
    trammel(blobsPath, TRAMMEL_OPTIONS),
    trammel(db2IndexesPath, TRAMMEL_OPTIONS),
    trammel(db2JitIndexesPath, TRAMMEL_OPTIONS),
    getLogFileSize(db2LogPath),
  ]).then((results) => {
    const rejectedResults = /** @type {PromiseRejectedResult[]} */ (
      results.filter((r) => r.status === 'rejected')
    )

    if (rejectedResults.length > 0) {
      // Just report the first error
      const err = new Error(rejectedResults[0].reason)
      cb(clarify(err, 'StorageUsed.getStats failed'))
      return
    }

    const [blobsResult, indexesResult, jitIndexesResult, logResult] =
      /** @type {StatsPromiseFulfilledResults} */ (results)

    cb(null, {
      blobs: blobsResult.value,
      indexes: indexesResult.value,
      jitIndexes: jitIndexesResult.value,
      log: logResult.value,
    })
  })
}

/**
 * @param {string} logPath
 * @returns {Promise<number>}
 */
function getLogFileSize(logPath) {
  return new Promise((res, rej) => {
    fs.stat(logPath, (err, stats) => {
      if (err) rej(err)
      else res(stats.size)
    })
  })
}

module.exports = getStats

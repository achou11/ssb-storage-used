const test = require('tape')
const path = require('path')
const tmp = require('tmp')
const SecretStack = require('secret-stack')
const caps = require('ssb-caps')
const ssbKeys = require('ssb-keys')
const pull = require('pull-stream')
const Ref = require('ssb-ref')

tmp.setGracefulCleanup()

const { name: fixtureDirPath } = tmp.dirSync({
  name: `ssb-storage-used-empty-${Date.now()}`,
  unsafeCleanup: true,
})

function createSbot() {
  const keys = ssbKeys.loadOrCreateSync(path.join(fixtureDirPath, 'secret'))
  const sbot = SecretStack({ appKey: caps.shs })
    .use(require('ssb-db2'))
    .use(require('../index'))
    .call(null, { keys, path: fixtureDirPath })

  return sbot
}

test('empty stats', (t) => {
  const sbot = createSbot()

  sbot.storageUsed.stats((err, stats) => {
    t.error(err, 'no error')
    t.equal(stats.blobs, 0, 'blob size is 0')
    console.log('stats', stats)
    t.ok(stats.indexes > 0, 'indexes is non-zero')
    t.equal(stats.logUsedBytes, 0, 'log records are zero')
    t.equal(stats.logDeletedBytes, 0, 'log deleted records are zero')
    t.equal(stats.jitIndexes, 0, 'jit indexes is 0')
    t.equal(stats.log, 0, 'log is 0 because it is not yet created')

    sbot.close(true, t.end)
  })
})

test('empty getBytesStored', (t) => {
  const sbot = createSbot()

  sbot.storageUsed.getBytesStored(sbot.id, (err, bytesStored) => {
    t.error(err)
    t.equals(bytesStored , 0, 'bytes stored for any author is zero')
    sbot.close(true, t.end)
  })
})

test('empty stream', (t) => {
  const sbot = createSbot()

  pull(
    sbot.storageUsed.stream(),
    pull.map((item) => {
      const [feedId, bytes] = item

      t.equal(typeof feedId, 'string', 'item[0] is a string')
      t.ok(Ref.isFeed(feedId), 'item[0] is a valid feed id')

      t.equal(typeof bytes, 'number', 'item[1] is a number')

      return item
    }),
    pull.collect((err, items) => {
      t.error(err, 'no error')
      t.equals(items.length, 0, 'zero items')

      sbot.close(true, t.end)
    })
  )
})

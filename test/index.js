const test = require('tape')
const fs = require('fs')
const path = require('path')
const tmp = require('tmp')
const generateFixture = require('ssb-fixtures')
const SecretStack = require('secret-stack')
const caps = require('ssb-caps')
const ssbKeys = require('ssb-keys')
const pull = require('pull-stream')
const Ref = require('ssb-ref')

const SEED = 'tiny'
const MESSAGES = 1000
const AUTHORS = 10

tmp.setGracefulCleanup()

const { name: fixtureDirPath } = tmp.dirSync({
  name: `ssb-storage-used-${Date.now()}`,
  unsafeCleanup: true,
})

const oldLogPath = path.join(fixtureDirPath, 'flume', 'log.offset')
const newLogPath = path.join(fixtureDirPath, 'db2', 'log.bipf')

function createSbot() {
  const keys = ssbKeys.loadOrCreateSync(path.join(fixtureDirPath, 'secret'))
  const sbot = SecretStack({ appKey: caps.shs })
    .use(require('ssb-db2'))
    .use(require('../index'))
    .call(null, { keys, path: fixtureDirPath })

  return sbot
}

test('generate fixture', (t) => {
  generateFixture({
    outputDir: fixtureDirPath,
    seed: SEED,
    messages: MESSAGES,
    authors: AUTHORS,
    slim: true,
  }).then(() => {
    t.true(
      fs.existsSync(oldLogPath),
      `fixture was created at: ${fixtureDirPath}`
    )

    const keys = ssbKeys.loadOrCreateSync(path.join(fixtureDirPath, 'secret'))
    const sbot = SecretStack({ appKey: caps.shs })
      .use(require('ssb-db2'))
      .call(null, { keys, path: fixtureDirPath, db2: { automigrate: true } })

    pull(
      sbot.db2migrate.progress(),
      pull.filter((progress) => progress === 1),
      pull.take(1),
      pull.drain(() => {
        setTimeout(() => {
          t.true(fs.existsSync(newLogPath), 'ssb-db2 migration completed')
          sbot.close(true, t.end)
        }, 1000)
      })
    )
  })
})

test('stats', (t) => {
  const sbot = createSbot()

  // Log size for seed 'tiny' with 1000 messages
  const expectedLogSize = 851968

  sbot.storageUsed.stats((err, stats) => {
    t.equal(stats.blobs, 0, 'blob size is 0')
    t.ok(stats.indexes > 0, 'indexes is non-zero')
    t.equal(stats.jitIndexes, 0, 'jit indexes is 0')
    t.equal(
      stats.log,
      expectedLogSize,
      `log is expected size for seed '${SEED}'`
    )

    sbot.close(true, t.end)
  })
})

test('getBytesStored', (t) => {
  const sbot = createSbot()

  sbot.storageUsed.getBytesStored(sbot.id, (err, bytesStored) => {
    t.error(err)
    t.ok(bytesStored > 0, `bytes stored for author is non-zero`)
    sbot.close(true, t.end)
  })
})

test('stream', (t) => {
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
      const isMonotonicallyDecreasing = items
        .map(([_, total]) => total)
        .every((current, index, array) => !index || array[index - 1] >= current)

      const authorsCount = new Set(items.map(([feed]) => feed)).size

      t.ok(isMonotonicallyDecreasing, 'results are monotonically decreasing')
      t.equal(authorsCount, AUTHORS, 'every feed is accounted for')

      sbot.close(true, t.end)
    })
  )
})

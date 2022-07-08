const test = require('tape')
const fs = require('fs')
const path = require('path')
const tmp = require('tmp')
const generateFixture = require('ssb-fixtures')
const SecretStack = require('secret-stack')
const caps = require('ssb-caps')
const ssbKeys = require('ssb-keys')
const pull = require('pull-stream')

const SEED = 'tiny'
const MESSAGES = 10000
const AUTHORS = 500

tmp.setGracefulCleanup()

const { name: fixtureDirPath } = tmp.dirSync({
  name: 'ssb-storage-used',
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

          sbot.db.onDrain('search', () => {
            sbot.close(true, t.end)
          })
        }, 1000)
      })
    )
  })
})

test('stats', (t) => {
  const sbot = createSbot()

  // Log size for seed 'tiny'
  const expectedLogSize = 8257536

  sbot.storageUsed.stats((err, stats) => {
    t.equal(stats.blobs, 0, 'blob size is 0')
    t.ok(stats.indexes > 0, 'indexes is non-zero')
    t.equal(
      stats.log,
      expectedLogSize,
      `log is expected size for seed '${SEED}'`
    )

    sbot.close(true, t.end)
  })
})

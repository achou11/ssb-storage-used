# ssb-storage-used

> secret stack plugin for getting storage usage information


## Install

`npm install ssb-storage-used`

## Usage

* Requires **Node 12** or higher
* Requires `ssb-db2`

```diff
SecretStack({appKey: require('ssb-caps').shs})
+ .use(require('ssb-db2'))
+ .use(require('ssb-storage-used'))
  .call(null, config)
```

## API

### `ssb.storageUsed.getBytesStored(feedId, cb) (muxrpc "async")`

- `feedId`: the feed id to get the bytes stored for
- `cb`: callback(err, bytesStored) where `bytesStored` is a number

Gets the total number of bytes stored on disk for a provided `feedId`

```js
ssb.storageUsed.getBytesStored(ssb.id, (err, bytesStored) => {
  console.log(`Feed ${ssb.id} uses ${bytesStored} bytes`)
})
```

### `ssb.storageUsed.stats(cb) (muxrpc "async")`

- `cb`: callback(err, stats)
  - `stats` is an object with the following fields:
    - `blobs: number`
    - `indexes: number`
    - `jitIndexes: number`
    - `log: number`
  - `err` will return the **first** error that occurs when checking the various directories

Get information about how much disk space `ssb/db2` takes up. This includes the log file, the indexes directories, and the blobs directories.

```js
ssb.storageUsed.stats((err, stats) => {
  Object.entries(stats).forEach(([name, bytesStored]) => {
    console.log(`${name} takes up ${bytesStored} bytes`)
  })
})
```

### `ssb.storageUsed.stream(): PullStream<Chunk> (muxrpc "source")`

Get a pull stream that sends a `Chunk`s sorted by feeds taking up the most storage to the least. A `Chunk` is an array of objects, where each object has the following fields:

  - `feed`: the feed id
  - `total`: the total number of bytes used by the feed

The items in each chunk are sorted from the highest to lowest `total` values.

```js
pull(
  ssb.storageUsed.stream(),
  pull.drain((chunk) => {
    console.log(`Chunk has ${chunk.length} feeds`)

    chunk.forEach(item => {
      console.log(`${item.feed} uses ${item.total} bytes`)
    })
  })
)
```

## License

MIT

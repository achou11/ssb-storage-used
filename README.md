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

### `ssb.storageUsed.stream(): PullStream<[feedId, bytes]> (muxrpc "source")`

Get a pull stream that sends a tuple where the first item is the feed id and the second item is the number of bytes used by that feed. The items returned by the stream are sorted from the highest to lowest `bytes` values.

```js
pull(
  ssb.storageUsed.stream(),
  pull.map((item) => {
    const [feedId, bytes] = item
    console.log(`Feed ${feedId} uses ${bytes} bytes`)
  })
)
```

## License

MIT

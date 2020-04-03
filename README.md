# QuickStorage

Simple key/value storage module with persistency on file system.

This module used to work in the browser with IndexedDB, more info can be found here https://github.com/BonneVoyager/quick-storage/tree/v1.4.0.

## Installation

```
npm install --save quick-storage
```

## Usage

`QuickStorage` expects an argument - a path to store data in the file system (otherwise, it will throw).

```ts
import QuickStorage from 'quick-storage'
const myStorage = new QuickStorage(`${__dirname}/data`)
```

This will create `${__dirname}/data` directory and store data in it. Each data key will be stored in separate file (key `myKey` will be store in file `${__dirname}/data/myKey`). File content is stringified on write, and parsed on read.

## API

```js
myStorage.set('myKey', { foo: 'bar' })
```

```js
myStorage.has('myKey') // true
```

```js
myStorage.get('myKey') // { "foo": "bar" }
```

```js
myStorage.keys() // [ "foo" ]
```

```js
myStorage.delete('myKey')
```

```js
myStorage.isReady // false before onReady callback, and true afterwards
```

```js
myStorage.onReady((fn) => {
  console.info('All previous data was read and I am ready for some work!')
})
```

```js
myStorage.onError((err) => {
  console.error('My storage error:', err)
})
```

```js
const obj = { foo: "bar" }
myStorage.proxy(obj, {
  preventExtensions: true, // whether to invoke Object.preventExtensions(obj)
  persistProps: [ 'foo' ]  // props which should keep the persistency
})
```

## Few tips

- please keep in mind that this module is intended to be used with small chunks of data (up to dozens of megabytes). All the data is stored in memory with `Map` cache object.
- data is parsed between string and json. That means that this module works only with JSON objects.
- when you create `QuickStorage(__dirname + '/data')`, the script will try to find and read data associated with `__dirname + '/data'` (read FS on the server). After it's read, storage object will call `onReady` function.
- you can use a callback as a second argument for `get` function to force read the data from the FS, instead of `Map` cache object.

## Test

```
npm run test
```

## Changelog

[CHANGELOG.md](https://github.com/BonneVoyager/quick-storage/blob/master/CHANGELOG.md)

## License

[MIT](LICENSE)

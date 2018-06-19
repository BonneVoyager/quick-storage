# QuickStorage

Simple key/value storage module with persistency and API compatible with modern browsers and the server.

In the browser it uses IndexedDB and on the server it uses file system.

## Installation

```
npm install --save quick-storage
```

## Browser

```js
const QuickStorage = require('quick-storage')
const myStorage = QuickStorage('myName')
```

This will create `myName` IndexedDB and store the values in it.

## Server

For the server, `QuickStorage` function expects second argument - a path to store data in the file system (otherwise, it will throw).

```js
const QuickStorage = require('quick-storage')
const myStorage = QuickStorage('myName', __dirname)
```

This will create `myName` directory in `__dirname` and store data in it. Each data key will be stored in separate file (key `myKey` will be store in file `myName/myKey`). File content is stringified on write, and parsed on read.

## API

```js
myStorage.set('myKey', { foo: 'bar' })
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
myStorage.onReady(() => {
  console.info('All previous data was read and I am ready for some work!')
})
```

```js
myStorage.onError((err) => {
  console.error('My storage error:', err)
})
```

## Hints

* **Size** - please keep in mind that this module is intended to be used with small chunks of data (up to dozens of megabytes). All the data is stored in memory with `Map` cache object.
* **Format** - data is parsed between string and json. That means that this module works only with JSON objects.
* **Persistency** - when you create `QuickStorage(yourName)`, the script will try to find and read data associated with `yourName` (read existing IndexedDB in the browser or read FS on the server). After it's read, storage object will call `onReady` function.
* **Reusability** - storage objects can be reused in node.js process in different places by using same name.
* **Assurance** - you can use a callback as a second argument for `get` function to force read the data from IndexedDB/FS, instead of `Map` cache object.

## Test

```
npm run test
```

## License

[MIT](LICENSE)

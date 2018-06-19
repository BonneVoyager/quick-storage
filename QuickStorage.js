!(function(factory, root) {
  if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = factory(global).ServerQuickStorage
  } else if (typeof define === 'function' && define.amd) {
    define([], function() {
      return factory(root).BrowserQuickStorage
    });
  } else {
    root.QuickStorage = factory(root).BrowserQuickStorage
  }
})(function(root) {
  "use strict"

  const cached = {} // data cache object

  function keys() { // get storage keys
    return Array.from(this.keys())
  }

  // browser version of storage object
  function BrowserQuickStorage(name) {
    if (cached[name]) {
      return cached[name]
    }

    function onReady() {}

    function onError() {}

    const data = new Map()

    const storeName = 'data'

    const indexedDB = root.indexedDB || root.mozIndexedDB || root.webkitIndexedDB || root.msIndexedDB
    if (!indexedDB) {
      onError('indexDB not supported')
      return
    }
  
    function getValue(key, callback) {
      if (typeof callback === 'function') {
        db.transaction(storeName)
          .objectStore(storeName)
          .get(key)
          .onsuccess = (event) => {
            callback((event.target.result && event.target.result.v) || null)
          }
      } else {
        return data.get(key)
      }
    }
  
    function setValue(key, value) {
      data.set(key, value)
      keyValue.k = key
      keyValue.v = value
      db.transaction(storeName, 'readwrite')
        .objectStore(storeName)
        .put(keyValue)
    }

    function deleteValue(key) {
      data.delete(key)
      db.transaction(storeName, 'readwrite')
        .objectStore(storeName)
        .delete(key)
    }

    let db
    const keyValue = {
        k: '',
        v: ''
      },
      request = indexedDB.open(name, 1)
    
    request.onsuccess = function(e) {
      db = this.result
      db.transaction(storeName, 'readwrite')
        .objectStore(storeName)
        .getAll()
        .onsuccess = (event) => {
          event.target.result.forEach(item => data.set(item.k, item.v))
          cached[name].onReady()
        }
    }

    request.onerror = function(event) {
      onError('indexedDB request error', event)
    }

    request.onupgradeneeded = function(event) {
      db = null
      const store = event.target.result.createObjectStore(storeName, {
        keyPath: 'k'
      })

      store.transaction.oncomplete = function(e) {
        db = e.target.db; 
      }
    }

    if (!cached[name]) {
      cached[name] = {
        get: getValue,
        set: setValue,
        delete: deleteValue,
        keys: keys.bind(data),
        onReady,
        onError
      }
    }

    return cached[name]
  }

  // server version of storage object
  function ServerQuickStorage(name, dataPath) {
    if (cached[name]) {
      return cached[name]
    }

    if (!dataPath) {
      throw new Error("No data path provided.")
    }

    const fs = require('fs')
    const path = require('path')

    function onReady() {}

    function onError() {}

    const data = new Map()

    const storagePath = path.join(dataPath, name)

    function getValue(key, callback) {
      if (typeof callback === 'function') {
        fs.readFile(`${storagePath}/${key}`, 'utf8', (err, res) => {
          err ? callback(err) : callback(null, JSON.parse(res))
        })
      } else {
        return data.get(key)
      }
    }
  
    function setValue(key, value) {
      data.set(key, value)
      fs.writeFileSync(
        `${storagePath}/${key}`,
        JSON.stringify(value),
        onError.bind(null, `QuickStorage cannot setValue ${key}.`)
      )
    }

    function deleteValue(key) {
      data.delete(key)
      fs.unlinkSync(`${storagePath}/${key}`)
    }

    if (!fs.existsSync(storagePath)) {
      fs.mkdir(storagePath, () => {
        cached[name].onReady()
      })
    } else {
      fs.readdir(storagePath, (err, files) => {
        if (err) {
          onError(err)
        } else if (files.length) {
          files.forEach((file, index) => 
            fs.readFile(`${storagePath}/${file}`, 'utf8', (err, content) => {
              if ((/(^|\/)\.[^\/\.]/g).test(file)) {
                return
              }
              if (err) {
                onError(`QuickStorage cannot readFile ${file}.`)
              } else {
                data.set(file, JSON.parse(content))
              }
              if (index + 1 === files.length) {
                cached[name].onReady()
              }
          }))
        } else {
          cached[name].onReady()
        }
      })
    }

    if (!cached[name]) {
      cached[name] = {
        get: getValue,
        set: setValue,
        delete: deleteValue,
        keys: keys.bind(data),
        onReady,
        onError
      }
    }

    return cached[name]
  }

  return {
    BrowserQuickStorage,
    ServerQuickStorage
  }
}, this)

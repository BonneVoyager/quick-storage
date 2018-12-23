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
  const cached = {} // data cache object
  const readyFns = {} // ready functions

  function keys() { // get storage keys
    return Array.from(this.keys())
  }

  function proxy(object, options) { // proxy the object
    if (typeof Proxy !== 'function') {
      throw new Error('Proxy not supported.')
    }
    
    const persistProps = options.persistProps

    if (persistProps && persistProps.length) {
      this.onReady(() => {
        for (let prop in object) {
          if (~persistProps.indexOf(prop)) {
            const value = this.get(prop) || object[prop]
            if (value === object[prop]) {
              this.set(prop, value)
            } else {
              object[prop] = value
            }
          }
        }
      })
    }

    if (options.preventExtensions) {
      Object.preventExtensions(object)
    }

    return new Proxy(object, {
      set: (obj, prop, value) => {
        obj[prop] = value
        if (persistProps && ~persistProps.indexOf(prop)) {
          this.set(prop, value)
        }
        return true
      },
      deleteProperty: (target, prop) => {
        if (prop in target) {
          delete target[prop]
          this.delete(prop)
        }
      }
    })
  }

  function onReady(name, fn) {
    if (typeof fn === 'function') {
      if (!readyFns[name]) {
        readyFns[name] = []
      }
      readyFns[name].push(fn)
    } else if (fn === true) {
      if (readyFns[name]) {
        for (let i = 0; i < readyFns[name].length; i++) {
          readyFns[name][i]()
        }
      }
      readyFns[name] = true
      cached[name].isReady = true
    }
  }

  function onError(fn) {
    if (typeof fn === 'function') {
      if (!this._onErrorFns) {
        this._onErrorFns = []
      }
      this._onErrorFns.push(fn)
    } else if (this._onErrorFns) {
      for (let i = 0; i < this._onErrorFns.length; i++) {
        this._onErrorFns[i].apply(this, arguments)
      }
    }
  }

  // browser version of storage object
  function BrowserQuickStorage(name) {
    if (cached[name]) {
      return cached[name]
    }

    const data = new Map()

    const storeName = 'data'

    const indexedDB = root.indexedDB || root.mozIndexedDB || root.webkitIndexedDB || root.msIndexedDB
    if (!indexedDB) {
      cached[name].onError(new Error('indexDB not supported'))
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
          cached[name].onReady(true)
        }
    }

    request.onerror = (err) => {
      cached[name].onError(err)
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
        onReady: onReady.bind(undefined, name),
        onError,
        proxy,
        isReady: false
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
      throw new Error('No data path provided.')
    }

    const fs = require('fs')
    const path = require('path')

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
        onError.bind(null, new Error(`QuickStorage cannot setValue ${key}.`))
      )
    }

    function deleteValue(key) {
      data.delete(key)
      fs.unlinkSync(`${storagePath}/${key}`)
    }

    if (!fs.existsSync(storagePath)) {
      fs.mkdir(storagePath, () => {
        cached[name].onReady(true)
      })
    } else {
      fs.readdir(storagePath, (err, files) => {
        if (err) {
          cached[name].onError(err)
        } else if (files.length) {
          files.forEach((file, index) => fs.readFile(`${storagePath}/${file}`, 'utf8', (err, content) => {
            if ((/(^|\/)\.[^\/\.]/g).test(file)) {
              return
            }
            if (err) {
              cached[name].onError(new Error(`QuickStorage cannot readFile ${file}.`))
            } else {
              data.set(file, JSON.parse(content))
            }
            if (index + 1 === files.length) {
              cached[name].onReady(true)
            }
          }))
        } else {
          cached[name].onReady(true)
        }
      })
    }

    if (!cached[name]) {
      cached[name] = {
        get: getValue,
        set: setValue,
        delete: deleteValue,
        keys: keys.bind(data),
        onReady: onReady.bind(undefined, name),
        onError,
        proxy,
        isReady: false
      }
    }

    return cached[name]
  }

  return {
    BrowserQuickStorage,
    ServerQuickStorage
  }
}, this)

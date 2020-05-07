import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'

const data = {}
const errorCallbacks = {}
const readyCallbacks = {}

export interface ProxyOptions {
  persistProps: string[]
  preventExtensions: boolean
}

export default class QuickStorage extends EventEmitter {
  public readonly storagePath: string

  public isReady: boolean

  public get size(): number {
    return data[this.storagePath].size
  }

  constructor(storagePath: string) {
    super()

    if (!storagePath) {
      throw new Error('No data path provided.')
    }

    this.isReady = false
    Object.defineProperty(this, 'storagePath', { value: path.join(storagePath) })

    data[this.storagePath] = new Map()
    errorCallbacks[this.storagePath] = []
    readyCallbacks[this.storagePath] = []

    if (!fs.existsSync(this.storagePath)) {
      fs.mkdir(this.storagePath, () => {
        this.onReady(true)
      })
    } else {
      fs.readdir(this.storagePath, (err, files) => {
        if (err) {
          this.onError(err)
        } else if (files.length) {
          files.forEach((file, index) => fs.readFile(`${this.storagePath}/${file}`, 'utf8', (err, content) => {
            if ((/(^|\/)\.[^\/\.]/g).test(file)) {
              return
            }
            if (err) {
              this.onError(new Error(`QuickStorage cannot readFile ${file}.`))
            } else {
              data[this.storagePath].set(file, JSON.parse(content))
            }
            if (index + 1 === files.length) {
              this.onReady(true)
            }
          }))
        } else {
          this.onReady(true)
        }
      })
    }
  }

  public onReady(fn: Function | true): void {
    const reaCallbacks = readyCallbacks[this.storagePath]
    if (typeof fn === 'function') {
      if (this.isReady) {
        fn()
      } else {
        reaCallbacks.push(fn)
      }
    } else if (fn === true && !this.isReady) {
      this.isReady = true
      for (let i = 0; i < reaCallbacks.length; i++) {
        reaCallbacks[i]()
      }
      this.emit('ready')
    }
  }
  
  public onError(fn?: Error | Function): void {
    const errCallbacks = errorCallbacks[this.storagePath]
    if (typeof fn === 'function') {
      errCallbacks.push(fn)
    } else if (errCallbacks) {
      for (let i = 0; i < errCallbacks.length; i++) {
        errCallbacks[i].apply(this, arguments)
      }
    }
  }

  public keys(): string[] {
    return Array.from(data[this.storagePath].keys())
  }

  public proxy(object: object, options: ProxyOptions): object {
    if (typeof Proxy !== 'function') {
      throw new Error('Proxy not supported.')
    }
    
    const { persistProps, preventExtensions } = options
  
    if (persistProps && persistProps.length) {
      this.onReady(() => {
        for (let prop in object) {
          if (persistProps.indexOf(prop) !== -1) {
            let value = object[prop]
            if (this.has(prop)) {
              value = this.get(prop)
            }
            if (value === object[prop]) {
              this.set(prop, value)
            } else {
              object[prop] = value
            }
          }
        }
      })
    }
  
    if (preventExtensions) {
      Object.preventExtensions(object)
    }
  
    return new Proxy(object, {
      set: (obj: object, prop: string, value: any): boolean => {
        obj[prop] = value
        if (persistProps && persistProps.indexOf(prop) !== -1) {
          this.set(prop, value)
        }
        return true
      },
      deleteProperty: (target, prop: string): boolean => {
        if (prop in target) {
          delete target[prop]
          return this.delete(prop)
        }
        return false
      }
    })
  }

  public get(key: string, callback?: Function): any {
    if (typeof callback === 'function') {
      fs.readFile(`${this.storagePath}/${key}`, 'utf8', (err, res) => {
        err ? callback(err) : callback(null, JSON.parse(res))
      })
    } else {
      return data[this.storagePath].get(key)
    }
  }

  public has(key: string): boolean {
    return data[this.storagePath].has(key)
  }

  public set(key: string, value: any): void {
    fs.writeFileSync(
      `${this.storagePath}/${key}`,
      JSON.stringify(value),
      this.onError.bind(null, new Error(`QuickStorage cannot setValue ${key}.`))
    )

    if (data[this.storagePath].has(key)) {
      data[this.storagePath].set(key, value)
      this.emit('update', key, value)
    } else {
      data[this.storagePath].set(key, value)
      this.emit('add', key, value)
    }
    this.emit('set', key, value)
  }

  public delete(key: string): boolean {
    if (fs.existsSync(`${this.storagePath}/${key}`)) {
      fs.unlinkSync(`${this.storagePath}/${key}`)
    }

    const deleted = data[this.storagePath].delete(key)
    this.emit('delete', key, deleted)
    return deleted
  }

  public forEach(callbackFn: Function, thisArg = this): void {
    data[this.storagePath].forEach(callbackFn, thisArg)
  }

  public clear(): void {
    const keys = this.keys()
    keys.forEach((key) => this.delete(key))
    this.emit('clear', keys)
  }
}

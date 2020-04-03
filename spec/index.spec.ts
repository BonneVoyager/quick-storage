import fs from 'fs'
import os from 'os'

import QuickStorage from '../src'

describe('QuickStorage', () => {

  const tmpDir = `${os.tmpdir()}/qs_test_${Date.now()}`

  let testQuickStorage
  let testProxyQuickStorage
  let testProxyQuickObject

  const testData = {
    foo: 'bar',
    bar: 'foo'
  }

  const testProxyData = {
    foo: 'bar',
    bar: 'foo'
  }

  beforeAll((done) => {
    try {
      fs.mkdirSync(tmpDir)
      fs.mkdirSync(`${tmpDir}/test`)
      fs.mkdirSync(`${tmpDir}/testProxy`)
    } catch (ex) {}

    fs.writeFileSync(`${tmpDir}/test/prev`, JSON.stringify(testData))
    
    testQuickStorage = new QuickStorage(`${tmpDir}/test`)
    testProxyQuickStorage = new QuickStorage(`${tmpDir}/testProxy`)
    testProxyQuickObject = testProxyQuickStorage.proxy(testProxyData, {
      preventExtensions: true,
      persistProps: ['foo', 'bar']
    })

    expect(testQuickStorage.isReady).toBe(false)

    testQuickStorage.onReady(() => {
      expect(testQuickStorage.isReady).toBe(true)
      done()
    })
  })

  it('should set isReady to true', () => {
    expect(testQuickStorage.isReady).toBe(true)
  })

  it('should read previous data', () => {
    expect(testQuickStorage.get('prev')).toEqual(testData)
  })

  it('should set data', () => {
    testQuickStorage.set('foo', testData)
    testQuickStorage.set('bar', testData)
    testQuickStorage.set('foobar', testData)
    expect(testQuickStorage.keys().length).toBe(4)
  })

  it('should use has function properly', () => {
    testQuickStorage.set('foo1')
    expect(testQuickStorage.has('foo1')).toBe(true)
    testQuickStorage.delete('foo1')
    expect(testQuickStorage.has('foo1')).toBe(false)
  })

  it('should get data sync', () => {
    expect(testQuickStorage.get('foo')).toEqual(testData)
  })

  it('should get data async', (done) => {
    testQuickStorage.get('foo', (err, res) => {
      expect(res).toEqual(testData)
      done()
    })
  })

  it('should delete data', () => {
    testQuickStorage.delete('foo')
    expect(testQuickStorage.keys().length).toBe(3)
  })

  it('should delete rest of the keys', () => {
    testQuickStorage.keys().forEach(key => testQuickStorage.delete(key))
    expect(testQuickStorage.keys().length).toBe(0)
  })

  it('should proxy an object', () => {
    expect(testProxyQuickObject.foo).toBe(testProxyQuickStorage.get('foo'))
    expect(testProxyQuickObject.bar).toBe(testProxyQuickStorage.get('bar'))

    testProxyQuickObject.foo = { 'key': 'value' }
    expect(testProxyQuickStorage.get('foo')).toEqual(testProxyQuickObject.foo)

    const fsContent = fs.readFileSync(`${tmpDir}/testProxy/foo`)
    expect(JSON.parse(fsContent.toString())).toEqual(testProxyQuickObject.foo)
  })
})

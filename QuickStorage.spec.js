const QuickStorage = require('./QuickStorage')

const chai = require('chai')
const fs = require('fs')
const os = require('os')
chai.should()

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

  before((done) => {
    try {
      fs.mkdirSync(tmpDir)
      fs.mkdirSync(`${tmpDir}/test`)
      fs.mkdirSync(`${tmpDir}/testProxy`)
    } catch (ex) {}

    fs.writeFileSync(`${tmpDir}/test/prev`, JSON.stringify(testData))
    
    testQuickStorage = QuickStorage('test', tmpDir)
    testProxyQuickStorage = QuickStorage('testProxy', tmpDir)
    testProxyQuickObject = testProxyQuickStorage.proxy(testProxyData, {
      preventExtensions: true,
      persistProps: [ 'foo', 'bar' ]
    })

    testQuickStorage.isReady.should.equal(false)

    testQuickStorage.onReady(done)
  })

  it('should set isReady to true', () => {
    testQuickStorage.isReady.should.equal(true)
  })

  it('should read previous data', () => {
    testQuickStorage.get('prev').should.deep.equal(testData)
  })

  it('should set data', () => {
    testQuickStorage.set('foo', testData)
    testQuickStorage.set('bar', testData)
    testQuickStorage.set('foobar', testData)
    testQuickStorage.keys().length.should.equal(4)
  })

  it('should get data sync', () => {
    testQuickStorage.get('foo').should.deep.equal(testData)
  })

  it('should get data async', (done) => {
    testQuickStorage.get('foo', (err, res) => {
      res.should.deep.equal(testData)
      done()
    })
  })

  it('should delete data', () => {
    testQuickStorage.delete('foo')
    testQuickStorage.keys().length.should.equal(3)
  })

  it('should delete rest of the keys', () => {
    testQuickStorage.keys().forEach(key => testQuickStorage.delete(key))
    testQuickStorage.keys().length.should.equal(0)
  })

  it('should proxy an object', () => {
    testProxyQuickObject.foo.should.equal(testProxyQuickStorage.get('foo'))
    testProxyQuickObject.bar.should.equal(testProxyQuickStorage.get('bar'))

    testProxyQuickObject.foo = { 'key': 'value' }
    testProxyQuickStorage.get('foo').should.deep.equal(testProxyQuickObject.foo)

    const fsContent = fs.readFileSync(`${tmpDir}/testProxy/foo`)
    JSON.parse(fsContent.toString()).should.deep.equal(testProxyQuickObject.foo)
  })

})

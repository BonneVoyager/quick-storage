const QuickStorage = require('./QuickStorage')

const chai = require('chai')
chai.should()

describe('QuickStorage', () => {

  const fs = require('fs')
  const os = require('os')
  const tmpDir = os.tmpdir() + "/qs_test_" + Date.now()
  let testQuickStorage

  const testData = {
    foo: 'bar',
    bar: 'foo'
  }

  before((done) => {
    try {
      fs.mkdirSync(tmpDir)
      fs.mkdirSync(tmpDir + "/test")
    } catch (ex) {}
    fs.writeFileSync(tmpDir + "/test/prev", JSON.stringify(testData))
    testQuickStorage = QuickStorage("test", tmpDir)
    testQuickStorage.onReady = done
  })

  it('should read previous data', () => {
    testQuickStorage.get("prev").should.deep.equal(testData)
  })

  it('should set data', () => {
    testQuickStorage.set("foo", testData)
    testQuickStorage.set("bar", testData)
    testQuickStorage.set("foobar", testData)
    testQuickStorage.keys().length.should.equal(4)
  })

  it('should get data sync', () => {
    testQuickStorage.get("foo").should.deep.equal(testData)
  })

  it('should get data async', (done) => {
    testQuickStorage.get("foo", (err, res) => {
      res.should.deep.equal(testData)
      done()
    })
  })

  it('should delete data', () => {
    testQuickStorage.delete("foo")
    testQuickStorage.keys().length.should.equal(3)
  })

  it('should delete rest of the keys', () => {
    testQuickStorage.keys().forEach(key => testQuickStorage.delete(key))
    testQuickStorage.keys().length.should.equal(0)
  })

})

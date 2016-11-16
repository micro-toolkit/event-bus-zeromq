var target = require('../../lib/store/filesystem')
var fs = require('fs')

describe('Store/Filesystem Module', function () {
  describe('#getInstance', function () {
    it('should return a error when filepath not specified', function () {
      target.getInstance.should.throw(/filepath is required/)
    })

    it('should return a error when filepath is not a string', function () {
      var getInstance = function () {
        target.getInstance(true)
      }
      getInstance.should.throw(/filepath is required/)
    })


    it('should return instance that responds to read', function () {
      var path = testConfig.supportDirPath + '/sequence.json'
      var store = target.getInstance(path)
      store.should.respondTo('read')
    })

    it('should return instance that responds to save operation', function () {
      var path = testConfig.supportDirPath + '/sequence.json'
      var store = target.getInstance(path)
      store.should.respondTo('save')
    })
  })

  describe('.read', function () {
    it('should return json serialized object', function () {
      var path = testConfig.supportDirPath + '/sequence.json'
      var store = target.getInstance(path)
      store.read().should.be.eql({ data: 99 })
    })

    it('should return null when file doesnt exist', function () {
      var path = testConfig.supportDirPath + '/unkown.json'
      var store = target.getInstance(path)
      should.not.exist(store.read())
    })
  })

  describe('.save', function () {
    it('should store a json serialized object', function () {
      var data = { data: 99 }
      var expected = JSON.stringify(data)
      var path = testConfig.supportDirPath + '/sequence_save.json'
      var store = target.getInstance(path)
      store.save(data)
      fs.readFileSync(path, 'utf8').should.be.eql(expected)
    })

    it('should return true when success', function () {
      var path = testConfig.supportDirPath + '/sequence_save.json'
      var store = target.getInstance(path)
      store.save({data: 99}).should.be.true
    })
  })
})

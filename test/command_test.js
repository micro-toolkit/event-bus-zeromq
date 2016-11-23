var target = require('../lib/command')
var toFrames = require('./support/frames_helper').toFrames

describe('Command Module', function () {
  describe('.syncStart', function () {
    it('should return a SYNC start command identifier', function () {
      target.syncStart.should.be.eq('SYNCSTART')
    })
  })

  describe('.syncEnd', function () {
    it('should return a SYNC end command identifier', function () {
      target.syncEnd.should.be.eq('SYNCEND')
    })
  })

  describe('.get', function () {
    it('should return a command from frames', function () {
      var frames = toFrames(['SYNCSTART', '/test', 1])
      var actual = target.get(frames)
      actual.should.have.property('cmd', 'SYNCSTART')
      actual.should.have.property('topic', '/test')
      actual.should.have.property('sequence', 1)
    })

    it('should respond to toFrames', function () {
      var frames = toFrames(['SYNCSTART', '/test', 1])
      var actual = target.get(frames)
      actual.should.respondTo('toFrames')
    })

    describe('.toFrames', function () {
      it('should return command in frames', function () {
        var frames = toFrames(['SYNCSTART', '/test', 1])
        var actual = target.get(frames).toFrames()
        actual.should.have.property('0', 'SYNCSTART')
        actual.should.have.property('1', '/test')
        actual.should.have.property('2', 1)
      })
    })
  })
})

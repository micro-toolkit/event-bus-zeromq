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

  describe('.sync', function () {
    it('should return a SYNC command identifier', function () {
      target.sync.should.be.eq('SYNC')
    })
  })

  describe('.get', function () {
    it('should return a command from frames', function () {
      var frames = toFrames(['SYNCSTART', '/test', 1])
      var actual = target.get(frames)
      actual.should.have.property('cmd')
      actual.should.have.property('topics')
      actual.should.have.property('sequence')
    })

    it('should return a command with cmd information', function () {
      var frames = toFrames(['SYNCSTART', '/test', 1])
      var actual = target.get(frames)
      actual.should.have.property('cmd', 'SYNCSTART')
    })

    it('should return a command with topics information', function () {
      var frames = toFrames(['SYNCSTART', '/test', 1])
      var actual = target.get(frames)
      actual.topics.should.have.be.eql(['/test'])
    })

    it('should return a command with topics parsed', function () {
      var frames = toFrames(['SYNCSTART', '/test,/other', 1])
      var actual = target.get(frames)
      actual.topics.should.be.eql(['/test', '/other'])
    })

    it('should return a command with sequence information', function () {
      var frames = toFrames(['SYNCSTART', '/test', 1])
      var actual = target.get(frames)
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
        actual.should.have.length.of(3)
      })

      it('should return cmd first frame', function () {
        var frames = toFrames(['SYNCSTART', '/test', 1])
        var actual = target.get(frames).toFrames()
        actual.should.have.property('0', 'SYNCSTART')
      })

      it('should return topics in second frame', function () {
        var frames = toFrames(['SYNCSTART', '/test', 1])
        var actual = target.get(frames).toFrames()
        actual.should.have.property('1', '/test')
      })

      it('should return topics serialized in second frame', function () {
        var frames = toFrames(['SYNCSTART', '/test,/something', 1])
        var actual = target.get(frames).toFrames()
        actual.should.have.property('1', '/test,/something')
      })

      it('should return sequence in third frame', function () {
        var frames = toFrames(['SYNCSTART', '/test', 1])
        var actual = target.get(frames).toFrames()
        actual.should.have.property('0', 'SYNCSTART')
        actual.should.have.property('1', '/test')
        actual.should.have.property('2', 1)
      })
    })
  })
})

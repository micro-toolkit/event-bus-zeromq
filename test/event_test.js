var uuidGen = require('uuid')
var eventFactory = require('../lib/event')
var msgpack = require('msgpack')

describe('Event Module', function () {

  describe('.getInstance', function () {
    var target = eventFactory.getInstance
    var clock

    beforeEach(function () {
      var ts = new Date('2016-11-10 16:00:00').getTime()
      clock = sinon.useFakeTimers(ts)
    })

    afterEach(function () {
      if (uuidGen.v4.restore) { uuidGen.v4.restore() }
      clock.restore()
    })

    describe('from collection of parameters', function () {
      it('should return a event instance', function () {
        var actual = target()
        actual.should.have.property('topic')
        actual.should.have.property('sequence')
        actual.should.have.property('uuid')
        actual.should.have.property('producer')
        actual.should.have.property('timestamp')
        actual.should.have.property('data')
      })

      it('should return a event with producer', function () {
        var actual = target('publisher')
        actual.should.have.property('producer', 'publisher')
      })

      it('should return a event with topic', function () {
        var actual = target('publisher', '/example/topic')
        actual.should.have.property('topic', '/example/topic')
      })

      it('should return a event with data', function () {
        var actual = target('publisher', '/example/topic', 'something')
        actual.should.have.property('data', 'something')
      })

      it('should return a event with sequence', function () {
        var actual = target('publisher', '/example/topic', 'something', 99)
        actual.should.have.property('sequence', 99)
      })

      it('should return a event with uuid', function () {
        var actual = target('publisher', '/example/topic', 'something', 0, 'uuid')
        actual.should.have.property('uuid', 'uuid')
      })

      it('should return a event with generated uuid when not present', function () {
        var expected = '453da075-ea7b-4e67-9f05-59bb830d8386'
        sinon.stub(uuidGen, "v4").returns(expected)
        var actual = target('publisher', '/example/topic', 'something', 0, null)
        actual.should.have.property('uuid', expected)
      })

      it('should return a event with timestamp', function () {
        var expected = new Date('2016-11-10 16:00:00')
        var actual = target('publisher', '/example/topic', 'something', 0, null,
          expected)
        actual.should.have.property('timestamp', expected)
      })

      it('should return a event with current timestamp when not present', function () {
        var expected = new Date('2016-11-10 16:00:00')
        var actual = target('publisher', '/example/topic', 'something')
        actual.should.have.property('timestamp')
        actual.timestamp.should.be.eql(expected)
      })
    })

    describe('from the frames', function () {
      var frames

      beforeEach(function () {
        frames = [ '/example/topic', 99, 'publisher',
          '2016-11-10T16:00:00.000Z', 'uuid', msgpack.pack('something') ]
      })

      it('should return a event instance', function () {
        var actual = target(frames)
        actual.should.have.property('topic')
        actual.should.have.property('sequence')
        actual.should.have.property('uuid')
        actual.should.have.property('producer')
        actual.should.have.property('timestamp')
        actual.should.have.property('data')
      })

      it('should return a event with producer', function () {
        var actual = target(frames)
        actual.should.have.property('producer', 'publisher')
      })

      it('should return a event with topic', function () {
        var actual = target(frames)
        actual.should.have.property('topic', '/example/topic')
      })

      it('should return a event with data', function () {
        var actual = target(frames)
        actual.should.have.property('data', 'something')
      })

      it('should return a event with sequence', function () {
        var actual = target(frames)
        actual.should.have.property('sequence', 99)
      })

      it('should return a event with uuid', function () {
        var actual = target(frames)
        actual.should.have.property('uuid', 'uuid')
      })

      it('should return a event with timestamp', function () {
        var expected = new Date('2016-11-10T16:00:00.000Z')
        var actual = target(frames)
        actual.should.have.property('timestamp')
        actual.timestamp.should.be.eql(expected)
      })

      describe('should decode the data frame and', function () {
        it('should decode string values properly', function () {
          var frames = [ '/example/topic', 99, 'publisher',
            '2016-11-10T16:00:00.000Z', 'uuid', msgpack.pack('something') ]

          var expected = 'something'
          var actual = target(frames)
          actual.data.should.eql(expected)
        })

        it('should decode integer values properly', function () {
          var frames = [ '/example/topic', 99, 'publisher',
            '2016-11-10T16:00:00.000Z', 'uuid', msgpack.pack(1337) ]

          var expected = 1337
          var actual = target(frames)
          actual.data.should.eql(expected)
        })

        it('should decode boolean false values properly', function () {
          var frames = [ '/example/topic', 99, 'publisher',
            '2016-11-10T16:00:00.000Z', 'uuid', msgpack.pack(false) ]

          var expected = false
          var actual = target(frames)
          actual.data.should.eql(expected)
        })

        it('should decode boolean true values properly', function () {
          var frames = [ '/example/topic', 99, 'publisher',
            '2016-11-10T16:00:00.000Z', 'uuid', msgpack.pack(true) ]

          var expected = true
          var actual = target(frames)
          actual.data.should.eql(expected)
        })

        it('should decode null values properly', function () {
          var frames = [ '/example/topic', 99, 'publisher',
            '2016-11-10T16:00:00.000Z', 'uuid', msgpack.pack(null) ]

          var actual = target(frames)
          var isEqual = actual.data === null
          isEqual.should.eql(true)
        })

        it('should decode undefined values as null properly', function () {
          var frames = [ '/example/topic', 99, 'publisher',
            '2016-11-10T16:00:00.000Z', 'uuid', msgpack.pack(undefined) ]

          var actual = target(frames)
          var isEqual = actual.data === null
          isEqual.should.eql(true)
        })

        it('should decode array values properly', function () {
          var frames = [ '/example/topic', 99, 'publisher',
            '2016-11-10T16:00:00.000Z', 'uuid', msgpack.pack([1, 'foo']) ]

          var expected = [1, 'foo']
          var actual = target(frames)
          actual.data.should.eql(expected)
        })

        it('should decode complex objects (JS object) properly', function () {
          var frames = [ '/example/topic', 99, 'publisher',
            '2016-11-10T16:00:00.000Z', 'uuid', msgpack.pack({a: 1, b: ['bar', false]}) ]

          var expected = {a: 1, b: ['bar', false]}
          var actual = target(frames)
          actual.data.should.eql(expected)
        })
      })
    })

    it('should return a event instance from frames', function () {
      var actual = target()
      actual.should.have.property('topic')
      actual.should.have.property('sequence')
      actual.should.have.property('uuid')
      actual.should.have.property('producer')
      actual.should.have.property('timestamp')
      actual.should.have.property('data')
    })
  })

  describe('.toFrames', function () {
    var evt

    beforeEach(function () {
      evt = eventFactory.getInstance(
        'publisher', '/example/topic', 'something',
        99, 'uuid', new Date('2016-11-10 16:00:00'))
    })

    it('should return 6 frames', function () {
      var actual = evt.toFrames()
      actual.should.have.lengthOf(6)
    })

    it('should return topic on frame 0', function () {
      var actual = evt.toFrames()
      actual[0].should.be.eq(evt.topic)
    })

    it('should return empty string on frame 0 when topic not specified', function () {
      evt.topic = null
      var actual = evt.toFrames()
      actual[0].should.be.eq('')
    })

    it('should return sequence on frame 1', function () {
      var actual = evt.toFrames()
      actual[1].should.be.eq(evt.sequence)
    })

    it('should return null on frame 1 when sequence not specified', function () {
      evt.sequence = null
      var actual = evt.toFrames()
      should.not.exist(actual[1])
    })

    it('should return producer on frame 2', function () {
      var actual = evt.toFrames()
      actual[2].should.be.eq(evt.producer)
    })

    it('should return timestamp on frame 3 as iso-8601', function () {
      var actual = evt.toFrames()
      actual[3].should.be.eq('2016-11-10T16:00:00.000Z')
    })

    it('should return timestamp on frame 4', function () {
      var actual = evt.toFrames()
      actual[4].should.be.eq(evt.uuid)
    })

    it('should return decoded data on frame 5', function () {
      var actual = evt.toFrames()
      actual[5].should.be.eql(msgpack.pack(evt.data))
    })

    it('should return null on frame 5 when data not specified', function () {
      evt.data = null
      var actual = evt.toFrames()
      should.not.exist(msgpack.unpack(actual[5]))
    })

    describe('should encode the data frame and', function () {
      it('should encode string values properly', function () {
        var evt = eventFactory.getInstance(
          'publisher', '/example/topic', 'something',
          99, 'uuid', new Date('2016-11-10 16:00:00'))

        var expected = msgpack.pack('something')
        var actual = evt.toFrames()

        actual[5].should.eql(expected)
      })

      it('should encode integer values properly', function () {
        var evt = eventFactory.getInstance(
          'publisher', '/example/topic', 123,
          99, 'uuid', new Date('2016-11-10 16:00:00'))

        var expected = msgpack.pack(123)
        var actual = evt.toFrames()

        actual[5].should.eql(expected)
      })

      it('should encode boolean false values properly', function () {
        var evt = eventFactory.getInstance(
          'publisher', '/example/topic', false,
          99, 'uuid', new Date('2016-11-10 16:00:00'))

        var expected = msgpack.pack(false)
        var actual = evt.toFrames()

        actual[5].should.eql(expected)
      })

      it('should encode boolean true values properly', function () {
        var evt = eventFactory.getInstance(
          'publisher', '/example/topic', true,
          99, 'uuid', new Date('2016-11-10 16:00:00'))

        var expected = msgpack.pack(true)
        var actual = evt.toFrames()

        actual[5].should.eql(expected)
      })

      it('should encode null values properly', function () {
        var evt = eventFactory.getInstance(
          'publisher', '/example/topic', null,
          99, 'uuid', new Date('2016-11-10 16:00:00'))

        var expected = msgpack.pack(null)
        var actual = evt.toFrames()

        actual[5].should.eql(expected)
      })

      it('should encode undefined to the null value properly', function () {
        var evt = eventFactory.getInstance(
          'publisher', '/example/topic', undefined,
          99, 'uuid', new Date('2016-11-10 16:00:00'))

        var expected = msgpack.pack(null)
        var actual = evt.toFrames()

        actual[5].should.eql(expected)
      })

      it('should encode array values properly', function () {
        var evt = eventFactory.getInstance(
          'publisher', '/example/topic', [1, 'a'],
          99, 'uuid', new Date('2016-11-10 16:00:00'))

        var expected = msgpack.pack([1, 'a'])
        var actual = evt.toFrames()

        actual[5].should.eql(expected)
      })

      it('should encode complex objects (JS Object) properly', function () {
        var evt = eventFactory.getInstance(
          'publisher', '/example/topic', {a: 1, b: [1, 'bar']},
          99, 'uuid', new Date('2016-11-10 16:00:00'))

        var expected = msgpack.pack({a: 1, b: [1, 'bar']})
        var actual = evt.toFrames()

        actual[5].should.eql(expected)
      })
    })
  })
})

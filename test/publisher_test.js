var uuidGen = require('uuid')
var zmq = require('zeromq')
var Logger = require('../logger')
var logHelper = require('./support/log_helper')
var zmqHelper = require('./support/zmq_helper')
var msgpack = require('msgpack')
var _ = require('lodash')

describe('Publisher Module', function () {
  var socket, publisher, log, config, clock

  before(function () {
    // since log is obtain on module loading this to the trick
    log = logHelper.getLogStub()
    sinon.stub(Logger, 'getLogger').returns(log)

    // we first should stub the logger because is required on module
    publisher = require('../lib/publisher')
  })

  after(function () {
    Logger.getLogger.restore()
  })

  beforeEach(function () {
    config = { producerId: 'producer' }
    socket = zmqHelper.getSocketStub()
    sinon.stub(zmq, 'socket').returns(socket)
    var ts = new Date('2016-11-10 16:00:00').getTime()
    clock = sinon.useFakeTimers(ts)
    sinon.stub(uuidGen, "v4").returns('uuid')
  })

  afterEach(function () {
    zmq.socket.restore()
    uuidGen.v4.restore()
    clock.restore()
  })

  describe('#getInstance', function () {
    it('should obtain the logger micro.bus.publisher', function() {
      publisher.getInstance(config)
      Logger.getLogger.should.have.been.calledWith('micro.bus.publisher')
    })

    it('should log stream opening information', function () {
      publisher.getInstance(config)
      log.info.should.have.been.calledWith(
        "Producer '%s' opened a publisher stream to %s",
        "producer", 'tcp://127.0.0.1:5558'
      )
    })

    it('should return a publisher instance', function () {
      publisher.getInstance(config).should.respondTo('send')
    })

    it('should enforce a valid producer id', function () {
      publisher.getInstance.should.throw(/Invalid producer id/)
    })

    it('should not create a socket yet', function () {
      publisher.getInstance(config)
      zmq.socket.should.not.have.been.called
    })
  })

  describe('.send', function () {
    var target

    beforeEach(function () {
      target = publisher.getInstance(config)
    })

    it('should open a zmq dealer socket', function () {
      target.send('/topic/test', "data")
      zmq.socket.should.have.been.calledWith('dealer')
    })

    it('should connect socket to configuration address', function () {
      config.address = 'tcp://127.0.0.1:6668'
      target = publisher.getInstance(config)
      target.send('/topic/test', "data")
      socket.connect.should.have.been.calledWith(config.address)
    })

    it('should connect socket to default address when not specified', function () {
      target.send('/topic/test', "data")
      socket.connect.should.have.been.calledWith('tcp://127.0.0.1:5558')
    })

    it('should disconnect socket afterwards', function () {
      target.send('/topic/test', "data")
      socket.disconnect.should.have.been.calledWith('tcp://127.0.0.1:5558')
        .and.calledAfter(socket.send)
    })

    it('should log that event was sent', function () {
      var evt = evt = {
        data: 'data',
        producer: 'producer',
        timestamp: new Date('2016-11-10 16:00:00'),
        topic: '/topic/test',
        uuid: 'uuid'
      }
      target.send('/topic/test', "data")
      log.debug.should.have.been.calledWith(
        evt, 'Published event to topic %s', '/topic/test'
      )
    })

    it('should send a event', function () {
      target.send('/topic/test', "data")
      socket.send.should.have.been.calledAfter(socket.connect)
    })

    it('should send a 0MQ message with 6 frames', function () {
      target.send('/topic/test', "data")
      socket.send.should.have.been.calledWith(
        sinon.match.has('length', 6)
      )
    })

    it('should send complex data properly', function () {
      target.send('/topic/test', {foo: 'bar'})
      socket.send.should.have.been.calledWith(
        sinon.match(function (value) {
          var data = value[5]
          return _.isEqual(msgpack.unpack(data), {foo: 'bar'})
        }, 'the data sent has not been serialized properly.')
      )
    })

    it('should send a 0MQ message with RFC format', function () {
      var serializedData = msgpack.pack('data')
      target.send('/topic/test', "data")
      socket.send.should.have.been.calledWith(
        sinon.match(function (value) {
          return value.length == 6
            && value[0] === '/topic/test'
            && value[1] === null
            && value[2] === 'producer'
            && value[3] === '2016-11-10T16:00:00.000Z'
            && value[4] === 'uuid'
            && value[5].equals(serializedData)
        }, 'matches RFC')
      )
    })
  })
})

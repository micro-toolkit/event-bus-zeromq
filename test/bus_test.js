var zmqHelper = require('./support/zmq_helper')
var logHelper = require('./support/log_helper')
var zmq = require('zmq')
var Logger = require('../logger')
var toFrames = require('./support/frames_helper').toFrames

describe('BUS Module', function () {
  var pubStub, collectorStub, snapshotStub, log, config, bus

  before(function () {
    // since log is obtain on module loading this to the trick
    log = logHelper.getLogStub()
    sinon.stub(Logger, 'getLogger').returns(log)

    // we first should stub the logger because is required on module
    bus = require('../lib/bus')
  })

  after(function () {
    Logger.getLogger.restore()
  })

  beforeEach(function () {
    config = {}
    collectorStub = zmqHelper.getSocketStub()
    pubStub = zmqHelper.getSocketStub()
    snapshotStub = zmqHelper.getSocketStub()
    var zmqStub = sinon.stub(zmq, 'socket')
    // since we dont have any other ways to detect different calls we need
    // to wire it with sequence of the calls :(
    zmqStub.withArgs('router').onFirstCall().returns(collectorStub)
    zmqStub.withArgs('router').onSecondCall().returns(snapshotStub)
    zmqStub.withArgs('pub').returns(pubStub)
  })

  afterEach(function () {
    zmq.socket.restore()
  })

  describe('#getInstance', function () {
    it('should return a instance that responds to close', function () {
      bus.getInstance(config).should.respondTo('close')
    })

    it('should return a instance that responds to connect', function () {
      bus.getInstance(config).should.respondTo('connect')
    })

    it('should obtain the logger micro.bus', function() {
      bus.getInstance(config)
      Logger.getLogger.should.have.been.calledWith('micro.bus')
    })

    describe('collector stream', function () {
      it('open a router 0MQ socket', function () {
        bus.getInstance(config)
        zmq.socket.should.have.been.calledWith('router')
        // we need to ensure that the test doesnt pass because other stream was open
        zmq.socket.should.have.been.calledThrice
      })

      it('should handle socket messages', function () {
        bus.getInstance(config)
        collectorStub.on.should.have.been.calledWith('message', match.func)
      })
    })

    describe('publisher stream', function () {
      it('should open a pub 0MQ socket', function () {
        bus.getInstance(config)
        zmq.socket.should.have.been.calledWith('pub')
      })
    })

    describe('snapshot stream', function () {
      it('open a router 0MQ socket', function () {
        bus.getInstance(config)
        zmq.socket.should.have.been.calledWith('router')
        // we need to ensure that the test doesnt pass because other stream was open
        zmq.socket.should.have.been.calledThrice
      })

      it('should handle socket messages', function () {
        bus.getInstance(config)
        snapshotStub.on.should.have.been.calledWith('message', match.func)
      })
    })
  })

  describe('connect', function () {
    it('should log connected streams information', function () {
      var target = bus.getInstance(config)
      target.connect()
      log.info.should.have.been.calledWith(
        'BUS opened the folowing streams\n\tsnapshot: %s\n\tpublisher: %s\n\tcollector: %s',
        'tcp://127.0.0.1:5556',
        'tcp://127.0.0.1:5557',
        'tcp://127.0.0.1:5558'
      )
    })

    describe('collector stream', function () {
      it('should connect socket', function () {
        var target = bus.getInstance()
        target.connect()
        collectorStub.bindSync.should.have.been.called
      })

      it('should connect socket to default configuration', function () {
        var target = bus.getInstance()
        target.connect()
        collectorStub.bindSync.should.have.been.calledWith('tcp://127.0.0.1:5558')
      })

      it('should connect socket to publisher configuration + 1', function () {
        var target = bus.getInstance({ publisher: 'tcp://127.0.0.1:7767' })
        target.connect()
        collectorStub.bindSync.should.have.been.calledWith('tcp://127.0.0.1:7768')
      })

      it('should connect socket to collector configuration', function () {
        var config = { collector: 'tcp://127.0.0.1:7777' }
        var target = bus.getInstance(config)
        target.connect()
        collectorStub.bindSync.should.have.been.calledWith('tcp://127.0.0.1:7777')
      })
    })

    describe('publisher stream', function () {
      it('should connect socket', function () {
        var target = bus.getInstance()
        target.connect()
        pubStub.bindSync.should.have.been.called
      })

      it('should connect socket to default configuration', function () {
        var target = bus.getInstance()
        target.connect()
        pubStub.bindSync.should.have.been.calledWith('tcp://127.0.0.1:5557')
      })

      it('should connect socket to publisher configuration', function () {
        var config = { publisher: 'tcp://127.0.0.1:7777' }
        var target = bus.getInstance(config)
        target.connect()
        pubStub.bindSync.should.have.been.calledWith('tcp://127.0.0.1:7777')
      })
    })

    describe('snapshot stream', function () {
      it('should connect socket', function () {
        var target = bus.getInstance()
        target.connect()
        snapshotStub.bindSync.should.have.been.called
      })

      it('should connect socket to default configuration', function () {
        var target = bus.getInstance()
        target.connect()
        snapshotStub.bindSync.should.have.been.calledWith('tcp://127.0.0.1:5556')
      })

      it('should connect socket to publisher configuration - 1', function () {
        var target = bus.getInstance({ publisher: 'tcp://127.0.0.1:7767' })
        target.connect()
        snapshotStub.bindSync.should.have.been.calledWith('tcp://127.0.0.1:7766')
      })

      it('should connect socket to snapshot configuration', function () {
        var config = { snapshot: 'tcp://127.0.0.1:7777' }
        var target = bus.getInstance(config)
        target.connect()
        snapshotStub.bindSync.should.have.been.calledWith('tcp://127.0.0.1:7777')
      })

      describe('handle SYNCSTART command', function () {
        var handler, frames

        beforeEach(function () {
          snapshotStub.on = function(evt, fn){ handler = fn }
          frames = toFrames(['identity', 'SYNCSTART', '/test', 1])
          var target = bus.getInstance(config)
          target.connect()
        })

        it('should log sync start information', function () {
          log.info.reset()
          handler.apply(null, frames)
          log.info.should.have.been.calledWith(
            'Sending snapshot=%d for subtrees=%s', 1, '/test'
          )
        })

        it('should log warning information when receiving a invalid snapshot message', function () {
          frames = toFrames(['identity', 'SYNCSTART'])
          handler.apply(null, frames)
          log.warn.should.have.been.calledWith(
            'Received a message format on snapshot socket!'
          )
        })

        it('should log warning information when receiving a unkown command', function () {
          frames = toFrames(['identity', 'SOMETHING', '/test', 1])
          handler.apply(null, frames)
          log.warn.should.have.been.calledWith(
            'Received a invalid command: \'%s\' on snapshot socket!',
            'SOMETHING'
          )
        })

        it('should return a SYNCEND command with client identity', function () {
          handler.apply(null, frames)
          snapshotStub.send.should.have.been.calledWith(
            match.has('0', 'identity')
          )
        })

        it('should return a SYNCEND command when there are no events stored', function () {
          handler.apply(null, frames)
          snapshotStub.send.should.have.been.calledWith(
            match.has('1', 'SYNCEND')
          )
        })

      })
    })

    it('should publish incoming events to publisher stream', function () {
      var handler
      var evtFrames = toFrames([
        'identity',
        '/test/1/topic', 1, 'producer',
        '2016-11-18T14:36:49.007Z', 'uuid', 'event-data'
      ])
      collectorStub.on = function(msg, fn) { handler = fn }
      bus.getInstance(config)

      handler.apply(null, evtFrames)

      pubStub.send.should.have.been.called
    })

    it('should increment sequence on each new event', function () {
      var handler
      var evtFrames = toFrames([
        'identity',
        '/test/1/topic', 1, 'producer',
        '2016-11-18T14:36:49.007Z', 'uuid', 'event-data'
      ])
      collectorStub.on = function(msg, fn) { handler = fn }
      bus.getInstance(config)
      handler.apply(null, evtFrames)
      pubStub.send.reset()
      handler.apply(null, evtFrames)

      pubStub.send.should.have.been.calledWith(
        sinon.match(function (value) {
          return value[1].should.be.eq(2)
        })
      )
    })

    it('should send 0MQ message in proper RFC format', function () {
      var handler
      var evtFrames = toFrames([
        'identity',
        '/test/1/topic', 1, 'producer',
        '2016-11-18T14:36:49.007Z', 'uuid', 'event-data'
      ])
      collectorStub.on = function(msg, fn) { handler = fn }
      bus.getInstance(config)

      handler.apply(null, evtFrames)

      pubStub.send.should.have.been.calledWith(
        sinon.match(function (value) {
          return value.length == 6
            && value[0] === '/test/1/topic'
            && value[1] === 1
            && value[2] === 'producer'
            && value[3] === '2016-11-18T14:36:49.007Z'
            && value[4] === 'uuid'
            && value[5] === 'event-data'
        }, 'matches frames specified in RFC')
      )
    })
  })

  describe('.close', function () {
    it('should close collector socket', function () {
      var target = bus.getInstance()
      target.connect()
      target.close()
      collectorStub.close.should.have.been.called
    })

    it('should close publisher socket', function () {
      var target = bus.getInstance()
      target.connect()
      target.close()
      pubStub.close.should.have.been.called
    })

    it('should log close streams information', function () {
      var target = bus.getInstance()
      target.connect()
      log.info.reset()
      target.close()
      log.info.should.have.been.calledWith('Closing BUS streams')
    })
  })
})

var zmq = require('zmq')
var Logger = require('../logger')
var fs = require('fs')
var toFrames = require('./support/frames_helper').toFrames

describe('Subscriber Module', function () {
  var subStub, dealerStub, log, subscriber

  before(function () {
    // since log is obtain on module loading this to the trick
    log = {
      debug: sinon.spy(),
      info: sinon.spy(),
      trace: sinon.spy(),
      warn: sinon.spy()
    }
    sinon.stub(Logger, 'getLogger').returns(log)

    // we first should stub the logger because is required on module
    subscriber = require('../lib/subscriber')
  })

  after(function () {
    Logger.getLogger.restore()
  })

  beforeEach(function () {
    dealerStub = {
      connect: sinon.spy(),
      on: sinon.spy(),
      send: sinon.spy() ,
      close: sinon.spy()
    }
    subStub = {
      connect: sinon.spy(),
      subscribe: sinon.spy(),
      on: sinon.spy(),
      unref: sinon.spy(),
      ref: sinon.spy(),
      close: sinon.spy()
    }
    var zmqStub = sinon.stub(zmq, 'socket')
    zmqStub.withArgs('dealer').returns(dealerStub)
    zmqStub.withArgs('sub').returns(subStub)

    var sequenceDumpPath = '/tmp/test_sequence.dump'
    if (fs.existsSync(sequenceDumpPath)) { fs.unlinkSync(sequenceDumpPath) }
  })

  afterEach(function () {
    zmq.socket.restore()
  })

  describe('#getInstance', function () {
    describe('snapshot stream', function () {
      it('open a dealer 0MQ socket', function () {
        subscriber.getInstance()
        zmq.socket.should.have.been.calledWith('dealer')
      })

      it('should handle socket messages', function () {
        subscriber.getInstance()
        dealerStub.on.should.have.been.calledWith('message', match.func)
      })
    })

    describe('subscriber stream', function () {
      it('should open a sub 0MQ socket', function () {
        subscriber.getInstance()
        zmq.socket.should.have.been.calledWith('sub')
      })

      it('should detach subscriber socket from event loop', function () {
        subscriber.getInstance()
        subStub.unref.should.have.been.called
      })

      it('should handle socket messages', function () {
        subscriber.getInstance()
        subStub.on.should.have.been.calledWith('message', match.func)
      })
    })
  })

  describe('.connect', function () {
    it('should log connect information', function () {
      var target = subscriber.getInstance()
      target.connect()
      log.info.should.have.been.calledWith(
        'Subscriber opened the folowing streams\n\tsnapshot: %s\n\tsubscriber: %s',
        'tcp://127.0.0.1:5556',
        'tcp://127.0.0.1:5557'
      )
    })

    describe('open a snapshot stream', function () {
      it('should connect socket', function () {
        var target = subscriber.getInstance()
        target.connect()
        dealerStub.connect.should.have.been.called
      })

      it('should connect socket to default configuration', function () {
        var target = subscriber.getInstance()
        target.connect()
        dealerStub.connect.should.have.been.calledWith('tcp://127.0.0.1:5556')
      })

      it('should connect socket to subscriber config port - 1', function () {
        var config = { address: 'tcp://127.0.0.1:6667' }
        var target = subscriber.getInstance(config)
        target.connect()
        dealerStub.connect.should.have.been.calledWith('tcp://127.0.0.1:6666')
      })

      it('should connect socket to snapshot config', function () {
        var config = { snapshot: 'tcp://127.0.0.1:7777' }
        var target = subscriber.getInstance(config)
        target.connect()
        dealerStub.connect.should.have.been.calledWith('tcp://127.0.0.1:7777')
      })
    })

    describe('open a subscriber stream', function () {
      it('should connect socket', function () {
        var target = subscriber.getInstance()
        target.connect()
        subStub.connect.should.have.been.called
      })

      it('should connect socket to default configuration', function () {
        var target = subscriber.getInstance()
        target.connect()
        subStub.connect.should.have.been.calledWith('tcp://127.0.0.1:5557')
      })

      it('should connect socket to address configuration', function () {
        var config = { address: 'tcp://127.0.0.1:7777' }
        var target = subscriber.getInstance(config)
        target.connect()
        subStub.connect.should.have.been.calledWith('tcp://127.0.0.1:7777')
      })

      it('should subscribe to topics', function () {
        var target = subscriber.getInstance()
        target.on('/test/1/topic', _.noop)
        target.connect()
        subStub.subscribe.should.have.been.called
      })

      it('should subscribe to topics registered', function () {
        var target = subscriber.getInstance()
        target.on('/test/1/topic', _.noop)
        target.on('/test/2/topic', _.noop)
        target.connect()
        subStub.subscribe.should.have.been.calledWith('/test/1/topic')
        subStub.subscribe.should.have.been.calledWith('/test/2/topic')
      })

      it('should subscribe topic before connect to stream', function () {
        var target = subscriber.getInstance()
        target.on('/test/1/topic', _.noop)
        target.connect()
        subStub.subscribe.should.have.been.calledBefore(subStub.connect)
      })
    })

    describe('do snapshot a sync', function () {
      it('should log that syncronization started', function () {
        var target = subscriber.getInstance()
        target.on('/test/1/topic', _.noop)
        log.info.reset()
        target.connect()
        log.info.should.have.been.calledWith(
          match.any,
          'Started subscriber syncronization for topics %s with sequence %s',
          '/test/1/topic', 0
        )
      })

      it('should send command with valid frame amount', function () {
        var target = subscriber.getInstance()
        target.on('/test/1/topic', _.noop)
        target.connect()
        dealerStub.send.should.have.been.calledWith(
          match.has('length', 3)
        )
      })

      it('should send SYNCSTART command', function () {
        var target = subscriber.getInstance()
        target.on('/test/1/topic', _.noop)
        target.connect()
        dealerStub.send.should.have.been.calledWith(
          match.has('0', 'SYNCSTART')
        )
      })

      it('should send SYNCSTART command containing the registered topics', function () {
        var target = subscriber.getInstance()
        target.on('/test/1/topic', _.noop)
        target.on('/test/1/topic2', _.noop)
        target.connect()
        dealerStub.send.should.have.been.calledWith(
          match.has('1', '/test/1/topic,/test/1/topic2')
        )
      })

      it('should send SYNCSTART command containing last sequence', function () {
        var path = testConfig.supportDirPath + '/sequence.dump'
        var config = { store: { path: path } }
        var target = subscriber.getInstance(config)
        target.on('/test/1/topic', _.noop)
        target.connect()
        dealerStub.send.should.have.been.calledWith(
          match.has('2', 99)
        )
      })

      it('should send SYNCSTART command containing last sequence to zero when not available', function () {
        var target = subscriber.getInstance()
        target.on('/test/1/topic', _.noop)
        target.connect()
        dealerStub.send.should.have.been.calledWith(
          match.has('2', 0)
        )
      })

      it('should trigger snapshot events', function () {
        var handler
        var evtFrames = toFrames([
          'SYNC', '/test/1/topic', 1, 'producer',
          '2016-11-18T14:36:49.007Z', 'uuid', 'event-data'
        ])
        var spy = sinon.spy()
        dealerStub.on = function(msg, fn) { handler = fn }
        var target = subscriber.getInstance()
        target.on('/test/1/topic', spy)
        target.connect()
        handler.apply(null, evtFrames)
        spy.should.have.been.calledWith('event-data')
      })

      it('should trigger snapshot events with partial topic match', function () {
        var handler
        var evtFrames = toFrames([
          'SYNC', '/test/1/topic', 1, 'producer',
          '2016-11-18T14:36:49.007Z', 'uuid', 'event-data'
        ])
        var spy = sinon.spy()
        dealerStub.on = function(msg, fn) { handler = fn }
        var target = subscriber.getInstance()
        target.on('/test/1', spy)
        target.connect()
        handler.apply(null, evtFrames)
        spy.should.have.been.calledWith('event-data')
      })

      it('should not trigger snapshot events without topic match', function () {
        var handler
        var evtFrames = toFrames([
          'SYNC', '/test/1/topic', 1, 'producer',
          '2016-11-18T14:36:49.007Z', 'uuid', 'event-data'
        ])
        var spy = sinon.spy()
        dealerStub.on = function(msg, fn) { handler = fn }
        var target = subscriber.getInstance()
        target.on('/test/2', spy)
        target.connect()
        handler.apply(null, evtFrames)
        spy.should.not.have.been.called
      })

      it('should log warning information about topic mismatch', function () {
        var handler
        var evtFrames = toFrames([
          'SYNC', '/test/1/topic', 1, 'producer',
          '2016-11-18T14:36:49.007Z', 'uuid', 'event-data'
        ])
        var spy = sinon.spy()
        dealerStub.on = function(msg, fn) { handler = fn }
        var target = subscriber.getInstance()
        target.on('/test/2', spy)
        target.connect()
        log.warn.reset()
        handler.apply(null, evtFrames)
        log.warn.should.have.been.calledWith(
          'Received a event without topic match for topic: %s', '/test/1/topic'
        )
      })

      it('should handle a SYNCEND command', function () {
        var handler
        var evtFrames = toFrames(['SYNCEND', '/test/1/topic', 1])
        var spy = sinon.spy()
        dealerStub.on = function(msg, fn) { handler = fn }
        var target = subscriber.getInstance()
        target.on('/test/1/topic', spy)
        target.connect()
        handler.apply(null, evtFrames)
        spy.should.not.have.been.called
      })

      it('should log snapshot sync completion', function () {
        var handler
        var evtFrames = toFrames(['SYNCEND', '/test/1/topic', 1])
        dealerStub.on = function(msg, fn) { handler = fn }
        var target = subscriber.getInstance()
        target.on('/test/1/topic', _.noop)
        target.connect()
        log.info.reset()
        handler.apply(null, evtFrames)
        log.info.should.have.been.calledWith(
          'Finished subscriber sync snapshot=%s for topics %s',
          1, '/test/1/topic'
        )
      })

      it('should attach subscriber socket to event loop', function () {
        var handler
        var evtFrames = toFrames(['SYNCEND', '/test/1/topic', 1])
        dealerStub.on = function(msg, fn) { handler = fn }
        var target = subscriber.getInstance()
        target.on('/test/1/topic', _.noop)
        target.connect()
        handler.apply(null, evtFrames)
        subStub.ref.should.have.been.called
      })

      it('should attach subscriber socket only after SYNCEND command', function () {
        var handler
        var evtFrames = toFrames([
          'SYNC', '/test/1/topic', 1, 'producer',
          '2016-11-18T14:36:49.007Z', 'uuid', 'event-data'
        ])
        dealerStub.on = function(msg, fn) { handler = fn }
        var target = subscriber.getInstance()
        target.on('/test/1/topic', _.noop)
        target.connect()
        handler.apply(null, evtFrames)
        subStub.ref.should.not.have.been.called
      })
    })
  })

  describe('.on', function () {
    it('should register topic', function(){
      var target = subscriber.getInstance()
      target.on('/test/1/topic', _.noop)
    })

    it('should log information about topic registration', function() {
      var target = subscriber.getInstance()
      log.info.reset()
      target.on('/test/1/topic', _.noop)
      log.info.should.have.been.calledWith(
        'Subscriber listens to the folowing topic: \'%s\'',
        '/test/1/topic'
      )
    })

    it('should receive events from subscribed topics', function () {
      var handler
      var evtFrames = toFrames([
        '/test/1/topic', 1, 'producer',
        '2016-11-18T14:36:49.007Z', 'uuid', 'event-data'
      ])
      var spy = sinon.spy()
      subStub.on = function(msg, fn) { handler = fn }
      var target = subscriber.getInstance()
      target.on('/test/1/topic', spy)
      target.connect()
      handler.apply(null, evtFrames)
      spy.should.have.been.calledWith('event-data')
    })

    it('should receive events from subscribed topics with partial match', function () {
      var handler
      var evtFrames = toFrames([
        '/test/1/topic', 1, 'producer',
        '2016-11-18T14:36:49.007Z', 'uuid', 'event-data'
      ])
      var spy = sinon.spy()
      subStub.on = function(msg, fn) { handler = fn }
      var target = subscriber.getInstance()
      target.on('/test/1', spy)
      target.connect()
      handler.apply(null, evtFrames)
      spy.should.have.been.calledWith('event-data')
    })

    it('should trigger events with sequence higher snapshot', function () {
      var handler, dealerHandler

      var syncEndFrames = toFrames(['SYNCEND', '/test/1/topic', 1])
      dealerStub.on = function(msg, fn) { dealerHandler = fn }

      var evtFrames = toFrames([
        '/test/1/topic', 2, 'producer',
        '2016-11-18T14:36:49.007Z', 'uuid', 'event-data'
      ])
      var spy = sinon.spy()
      subStub.on = function(msg, fn) { handler = fn }
      var target = subscriber.getInstance()
      target.on('/test/1', spy)
      target.connect()

      dealerHandler.apply(null, syncEndFrames)
      handler.apply(null, evtFrames)

      spy.should.have.been.calledWith('event-data')
    })

    it('should not trigger events with sequence bellow snapshot', function () {
      var handler, dealerHandler

      var syncEndFrames = toFrames(['SYNCEND', '/test/1/topic', 1])
      dealerStub.on = function(msg, fn) { dealerHandler = fn }

      var evtFrames = toFrames([
        '/test/1/topic', 1, 'producer',
        '2016-11-18T14:36:49.007Z', 'uuid', 'event-data'
      ])
      var spy = sinon.spy()
      subStub.on = function(msg, fn) { handler = fn }
      var target = subscriber.getInstance()
      target.on('/test/1', spy)
      target.connect()

      dealerHandler.apply(null, syncEndFrames)
      handler.apply(null, evtFrames)

      spy.should.not.have.been.called
    })

    it('should receive events from subscribed topics to all registered handlers', function () {
      var handler
      var evtFrames = toFrames([
        '/test/1/topic', 1, 'producer',
        '2016-11-18T14:36:49.007Z', 'uuid', 'event-data'
      ])
      var firstSpy = sinon.spy()
      var secondSpy = sinon.spy()
      subStub.on = function(msg, fn) { handler = fn }
      var target = subscriber.getInstance()
      target.on('/test/1/topic', firstSpy)
      target.on('/test/1/topic', secondSpy)
      target.connect()
      handler.apply(null, evtFrames)
      firstSpy.should.have.been.calledWith('event-data')
      secondSpy.should.have.been.calledWith('event-data')
    })
  })

  describe('.close', function () {
    it('should close subscriber stream', function () {
      var target = subscriber.getInstance()
      target.connect()
      target.close()
      subStub.close.should.have.been.called
    })

    it('should close snapshot stream', function () {
      var target = subscriber.getInstance()
      target.connect()
      target.close()
      dealerStub.close.should.have.been.called
    })

    it('should persist last sequence number', function () {
      var handler
      var evtFrames = toFrames([
        '/test/1/topic', 666, 'producer',
        '2016-11-18T14:36:49.007Z', 'uuid', 'event-data'
      ])
      subStub.on = function(msg, fn) { handler = fn }
      var config = {store: { path: '/tmp/test_sequence.dump' }}
      var target = subscriber.getInstance(config)
      target.on('/test/1/topic', _.noop)
      target.connect()
      handler.apply(null, evtFrames)
      target.close()

      var data = fs.readFileSync(config.store.path, 'utf8')
      JSON.parse(data).should.be.eql(666)
    })

    it('should log close information', function () {
      var target = subscriber.getInstance()
      target.connect()
      log.info.reset()
      target.close()
      log.info.should.have.been.calledWith('Closed subscriber streams')
    })
  })
})

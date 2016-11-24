var uuidGen = require('uuid')
var zmq = require('zmq')
var _ = require('lodash')
var util = require('util')
var Logger = require('../logger')
var log = Logger.getLogger('micro.bus.subscriber')
var command = require('./command')
var storeFactory = require('./store/filesystem')
var eventFactory = require('./event')

var defaults = {
  snapshot: 'tcp://127.0.0.1:5556',
  address: 'tcp://127.0.0.1:5557',
  store: { path: __dirname + '/../sequence.dump' }
}

function getConfig(conf) {
  var config = _.defaults({}, conf, defaults)

  // if address specified and not snapshot
  // override with address - 1
  if (conf && conf.address && !conf.snapshot) {
    var addressParts = conf.address.split(':')
    var protocol = addressParts[0]
    var addr = addressParts[1]
    var port = addressParts[2]
    var snapshotPort = parseInt(port, 10) - 1
    config.snapshot = util.format('%s:%s:%s', protocol, addr, snapshotPort)
  }

  return config
}

function connect(snapshot, subscriber, config, handlers) {
  var topics = _.keys(handlers)
  topics.forEach(function(topic) {
    subscriber.subscribe(topic)
  })
  snapshot.connect(config.snapshot)
  subscriber.connect(config.address)

  log.info('Subscriber opened the folowing streams\n\tsnapshot: %s\n\tsubscriber: %s',
    config.snapshot, config.address)

  var sequence = config.store.instance.read() || 0
  var topicsFrame = topics.join(',')
  var syncStartFrames = [command.syncStart, topicsFrame, sequence]
  log.info(syncStartFrames, 'Started subscriber sync for snapshot=%s of topics %s',
    sequence, topicsFrame)
  snapshot.send(syncStartFrames)
}

function on(handlers, topic, handler) {
  if (!handlers[topic]) {
    handlers[topic] = []
  }

  handlers[topic].push(handler)
  log.info('Subscriber listens to the folowing topic: \'%s\'', topic)
}

function triggerEvent(handlers, evt) {
  _.keys(handlers).forEach(function(key){
    if (!evt.topic.startsWith(key)) {
      log.warn('Received a event without topic match for topic: %s', evt.topic)
      return
    }

    log.trace('Trigger event for topic %s', evt.topic)
    handlers[key].forEach(function(callback){
      callback(evt.data)
    })
  })
}

function snapshotHandler(handlers, subscriber, state) {
  var frames = Array.prototype.slice.call(arguments, 3)
  var cmd = frames.shift()
  log.debug(frames, 'Received snapshot command: %s - %s',
    cmd, frames[1])

  if (cmd == command.syncEnd) {
    var topics = frames.shift().toString()
    var sequence = parseInt(frames.shift().toString(), 10)
    log.info('Finished subscriber sync snapshot=%s for topics %s',
      sequence, topics)

    // save last sequence received
    state.sequence = sequence

    // Now apply pending updates, discard out-of-sequence messages
    subscriber.ref()

    return
  }

  var evt = eventFactory.getInstance(frames)
  triggerEvent(handlers, evt)
}

function subscriberHandler(handlers, state) {
  var frames = Array.prototype.slice.call(arguments, 2)
  var evt = eventFactory.getInstance(frames)

  // should discard all events previous to last snapshot sequence
  var isNewEvent = state.sequence === 0 || evt.sequence > state.sequence
  if(isNewEvent){
    triggerEvent(handlers, evt)
    state.sequence = evt.sequence
  }
}

function close(snapshot, subscriber, store, state) {
  log.info('Closed subscriber streams')
  snapshot.close()
  subscriber.close()
  store.save(state.sequence)
}

function getInstance(conf) {
  // dictionary to store the handlers
  var handlers = {}

  var snapshot = zmq.socket('dealer')
  snapshot.identity = uuidGen.v4()

  var subscriber = zmq.socket('sub')
  var config = getConfig(conf)
  log.info('Loading state from %s', config.store.path)
  config.store.instance = storeFactory.getInstance(config.store.path)

  // Detach the socket from the main event loop of the node.js runtime.
  // This will temporarily disable pooling on a specific ZMQ socket and
  // all messages will queue on the ZMQ internal queue
  subscriber.unref()

  var state = { sequence: 0 }
  snapshot.on('message', _.partial(snapshotHandler, handlers, subscriber, state))
  subscriber.on('message', _.partial(subscriberHandler, handlers, state))

  return {
    on: _.partial(on, handlers),
    connect: _.partial(connect, snapshot, subscriber, config, handlers),
    close: _.partial(close, snapshot, subscriber, config.store.instance, state)
  }
}

module.exports = {
  getInstance: getInstance
}

var _ = require('lodash')
var zmq = require('zmq')
var address = require('./address')
var Logger = require('../logger')
var log = Logger.getLogger('micro.bus')
var eventFactory = require('./event')
var commands = require('./command')

var defaults = {
  snapshot: 'tcp://127.0.0.1:5556',
  publisher: 'tcp://127.0.0.1:5557',
  collector: 'tcp://127.0.0.1:5558'
}

function getConfig(conf) {
  var config = _.defaults({}, conf, defaults)

  // if publisher specified and not snapshot
  // override with address - 1
  if (conf && conf.publisher && !conf.snapshot) {
    config.snapshot = address.get(conf.publisher, -1)
  }

  // if publisher specified and not collector
  // override with address + 1
  if (conf && conf.publisher && !conf.collector) {
    config.collector = address.get(conf.publisher, 1)
  }

  return config
}

function collectorHandler(publisher, state) {
  // remove 2 function parameters + 0MQ identity frame
  var frames = Array.prototype.slice.call(arguments, 3)
  var evt = eventFactory.getInstance(frames)
  evt.sequence = ++state.sequence
  publisher.send(evt.toFrames())
}

function isValidSnapshotMessage(frames) {
  if (frames.length != 3) {
    log.warn('Received a message format on snapshot socket!')
    return false
  }

  var cmd = frames[0].toString()
  if (cmd !==  commands.syncStart) {
    log.warn('Received a invalid command: \'%s\' on snapshot socket!', cmd)
    return false
  }

  return true
}

function snapshotHandler(snapshot) {
  // remove 1 function parameters
  var frames = Array.prototype.slice.call(arguments, 1)
  // remove client 0MQ identity
  var identity = frames.shift().toString()

  if (!isValidSnapshotMessage(frames)) { return }

  var command = commands.get(frames)
  log.info('Sending snapshot=%d for subtrees=%s', command.sequence, command.topic)

  command.cmd = commands.syncEnd
  frames = command.toFrames()
  // include client 0MQ identity
  frames.unshift(identity)
  snapshot.send(frames)
}

function connect(publisher, collector, snapshot, config) {
  publisher.bindSync(config.publisher)
  collector.bindSync(config.collector)
  snapshot.bindSync(config.snapshot)

  log.info('BUS opened the folowing streams\n\tsnapshot: %s\n\tpublisher: %s\n\tcollector: %s',
    config.snapshot, config.publisher, config.collector)
}

function close(publisher, collector) {
  log.info('Closing BUS streams')
  publisher.close()
  collector.close()
}

function getInstance(conf) {
  var config = getConfig(conf)

  var publisher = zmq.socket('pub')
  var collector = zmq.socket('router')
  var snapshot = zmq.socket('router')

  var state = { sequence: 0 }

  collector.on('message', _.partial(collectorHandler, publisher, state))
  snapshot.on('message', _.partial(snapshotHandler, snapshot))

  return {
    connect: _.partial(connect, publisher, collector, snapshot, config),
    close: _.partial(close, publisher, collector)
  }
}

module.exports = {
  getInstance: getInstance
}

var _ = require('lodash')
var zmq = require('zmq')
var address = require('./address')
var Logger = require('../logger')
var log = Logger.getLogger('micro.bus')
var eventFactory = require('./event')
var storeFactory = require('./store/filesystem')
var eventStorefactory = require('micro-toolkit-event-storage-mongo')
var commands = require('./command')

var defaults = {
  snapshot: 'tcp://127.0.0.1:5556',
  publisher: 'tcp://127.0.0.1:5557',
  collector: 'tcp://127.0.0.1:5558',
  store: {
    path: '/tmp/bus_sequence.dump',
    dbUrl: 'mongodb://localhost/event_bus'
  }
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

function collectorHandler(publisher, state, store) {
  // remove 3 function parameters + 0MQ identity frame
  var frames = Array.prototype.slice.call(arguments, 4)
  var evt = eventFactory.getInstance(frames)
  evt.sequence = ++state.sequence
  log.debug('Publish event with sequence=%s and topic=%s',
    evt.sequence, evt.topic)
  publisher.send(evt.toFrames())
  return store.eventInstance.insert(evt.sequence, evt)
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

function sendCommand(snapshot, identity, frames) {
  // include client 0MQ identity
  frames.unshift(identity)
  log.trace('Sending command %s', frames)
  snapshot.send(frames)
}

function createEventModel(eventData) {
  return eventFactory.getInstance(
    eventData.producer, eventData.topic, eventData.data,
    eventData.sequence, eventData.uuid, eventData.timestamp)
}

function snapshotHandler(snapshot, state, store) {
  // remove 3 function parameters
  var frames = Array.prototype.slice.call(arguments, 3)
  // remove client 0MQ identity
  var identity = frames.shift().toString()

  if (!isValidSnapshotMessage(frames)) { return }

  var command = commands.get(frames)
  log.info('Sending snapshot=%d for subtrees=%s', command.sequence, command.topics.join(', '))

  return store.eventInstance.get(command.sequence)
    .then(function (events) {
      // console.log('Events %j', events)
      return _.chain(events)
          .map(createEventModel)
          .filter(function(evt){
            return _.some(command.topics, function(topic){
              return evt.topic.startsWith(topic)
            })
          })
          .value()
          .forEach(function(evt){
            log.debug('Sending a SYNC message for sequence=%s and topic=%s',
              evt.sequence, evt.topic)
            var syncFrames = evt.toFrames()
            syncFrames.unshift(commands.sync)
            sendCommand(snapshot, identity, syncFrames)
          })
    })
    .then(function () {
      // send sync end message
      log.info('Sent snapshot=%d for subtrees=%s', state.sequence, command.topics.join(', '))
      command.sequence = state.sequence
      command.cmd = commands.syncEnd
      frames = command.toFrames()
      return sendCommand(snapshot, identity, frames)
    })
}

function connect(publisher, collector, snapshot, config, state) {
  publisher.bindSync(config.publisher)
  collector.bindSync(config.collector)
  snapshot.bindSync(config.snapshot)

  state.sequence = config.store.instance.read() || 0

  log.info('Loaded state sequence=%s', state.sequence)
  log.info('BUS opened the folowing streams\n\tsnapshot: %s\n\tpublisher: %s\n\tcollector: %s',
    config.snapshot, config.publisher, config.collector)
}

function close(publisher, collector, store, state) {
  log.info('Closing BUS streams')
  publisher.close()
  collector.close()
  store.instance.save(state.sequence)
}

function getInstance(conf) {
  var config = getConfig(conf)

  var publisher = zmq.socket('pub')
  var collector = zmq.socket('router')
  var snapshot = zmq.socket('router')

  var state = { sequence: null, events: [] }
  log.info('Loading sequence state from %s', config.store.path)
  config.store.instance = storeFactory.getInstance(config.store.path)

  if (!config.store.eventInstance) {
    config.store.eventInstance = eventStorefactory.getInstance(config.store.dbUrl)
  }

  collector.on('message', _.partial(collectorHandler, publisher, state, config.store))
  snapshot.on('message', _.partial(snapshotHandler, snapshot, state, config.store))

  return {
    connect: _.partial(connect, publisher, collector, snapshot, config, state),
    close: _.partial(close, publisher, collector, config.store, state)
  }
}

module.exports = {
  getInstance: getInstance
}

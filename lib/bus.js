var _ = require('lodash')
var zmq = require('zmq')
var address = require('./address')
var Logger = require('../logger')
var log = Logger.getLogger('micro.bus')
var eventFactory = require('./event')

var defaults = {
  snapshot: 'tcp://127.0.0.1:5556',
  publisher: 'tcp://127.0.0.1:5557',
  collector: 'tcp://127.0.0.1:5558'
}

function getConfig(conf) {
  var config = _.defaults({}, conf, defaults)

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

function connect(publisher, collector, config) {
  publisher.bindSync(config.publisher)
  collector.bindSync(config.collector)

  log.info('BUS opened the folowing streams\n\tpublisher: %s\n\tcollector: %s',
    config.publisher, config.collector)
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
  var state = { sequence: 0 }

  collector.on('message', _.partial(collectorHandler, publisher, state))

  return {
    connect: _.partial(connect, publisher, collector, config),
    close: _.partial(close, publisher, collector)
  }
}

module.exports = {
  getInstance: getInstance
}

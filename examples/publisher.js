var config = {
  // optional, this is the default address
  address: 'tcp://127.0.0.1:5558',
  producerId: 'someproducer'
}
// var bus = require('micro-toolkit-event-bus-zeromq')
var bus = require('../index')
var publisher = bus.getPublisher(config)

publisher.send('/example/topic', "somedata")

console.log('Event was sent!') // eslint-disable-line no-console

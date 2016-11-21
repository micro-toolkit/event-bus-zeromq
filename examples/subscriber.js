var config = {
  // optional, this is the default address
  address: 'tcp://127.0.0.1:5557',
  // optional, defaults to ./sequence.dump
  store: { path: '/tmp/examples_sequence.dump' }
}
// var bus = require('micro-toolkit-event-bus-zeromq')
var bus = require('../index')
var subscriber = bus.getSubscriber(config)

subscriber.on('/examples', function(data){
  // eslint-disable-next-line no-console
  console.log("Event was received => %j", data)
})

function close() {
  subscriber.close()
}

// eslint-disable-next-line no-process-exit
process.on('SIGINT', close)

subscriber.connect()

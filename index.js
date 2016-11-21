var publisher = require('./lib/publisher')
var subscriber = require('./lib/subscriber')

module.exports = {
  getPublisher: publisher.getInstance,
  getSubscriber: subscriber.getInstance
}

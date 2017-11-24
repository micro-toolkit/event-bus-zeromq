var _ = require('lodash')
var Promise = require('bluebird')

function insert(state, sequence, raw) {
  state.push({ sequence: sequence, raw: raw })
  return Promise.resolve()
}

function lastSequence(state) {
  var entry = _.maxBy(state, 'sequence') || null
  return Promise.resolve(_.get(entry, 'sequence') || null)
}

function get(state, sequence) {
  var events = _.chain(state)
    .filter(function(evt){
      return evt.sequence > sequence
    })
    .map(function(evt) {
      return evt.raw
    })
    .values()

  return Promise.resolve(events)
}

function getInstance() {
  var state = []
  return {
    insert: _.partial(insert, state),
    get: _.partial(get, state),
    lastSequence: _.partial(lastSequence, state)
  }
}

module.exports = {
  getInstance: getInstance
}

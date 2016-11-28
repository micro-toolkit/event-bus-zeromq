var _ = require('lodash')
var Promise = require('bluebird')

function insert(state, sequence, raw) {
  state.push({ sequence: sequence, raw: raw })
  return Promise.resolve()
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
    get: _.partial(get, state)
  }
}

module.exports = {
  getInstance: getInstance
}

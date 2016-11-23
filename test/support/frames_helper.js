var _ = require('lodash')

function toFrames(frames) {
  return _.map(frames, function(frame){
    return Buffer.from(String(frame), 'utf8')
  })
}

module.exports = { toFrames: toFrames }

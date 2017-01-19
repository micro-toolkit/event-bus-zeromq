var _ = require('lodash')
var msgpack = require('msgpack')

function toFrames(frames) {
  return _.map(frames, function(frame){
    return Buffer.from(String(frame), 'utf8')
  })
}

function toDataFrames(frames) {
  var lastEncodedFrame = msgpack.pack(_.last(frames))
  return _.concat(toFrames(_.initial(frames)), lastEncodedFrame)
}

module.exports = {
  toFrames: toFrames,
  toDataFrames: toDataFrames
}

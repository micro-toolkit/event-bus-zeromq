var _ = require('lodash')

function getFrames(command) {
  return [command.cmd, command.topics.join(','), command.sequence]
}

function getCommand(frames) {
  var cmd = {
    cmd: frames[0].toString(),
    topics: frames[1].toString().split(','),
    sequence: parseInt(frames[2].toString(), 10),
  }

  cmd.toFrames = _.partial(getFrames, cmd)

  return cmd
}

module.exports = {
  syncStart: 'SYNCSTART',
  syncEnd: 'SYNCEND',
  sync: 'SYNC',
  get: getCommand
}

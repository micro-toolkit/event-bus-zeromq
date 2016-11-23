var _ = require('lodash')

function getFrames(command) {
  return [command.cmd, command.topic, command.sequence]
}

function getCommand(frames) {
  var cmd = {
    cmd: frames[0].toString(),
    topic: frames[1].toString(),
    sequence: parseInt(frames[2].toString(), 10),
  }

  cmd.toFrames = _.partial(getFrames, cmd)

  return cmd
}

module.exports = {
  syncStart: 'SYNCSTART',
  syncEnd: 'SYNCEND',
  get: getCommand
}

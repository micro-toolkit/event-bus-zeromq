var _ = require('lodash')
var Logger = require('logger-facade-nodejs')
var LoggerConsolePlugin = require('logger-facade-console-plugin-nodejs')


function setup(command, help, defaults) {
  var argv = require('minimist')(process.argv.slice(2))

  if (argv.help) {
    /* eslint-disable no-console */
    console.log('\nUsage:')
    console.log('\n$ bin/publisher -a %s -p %s -t %s -i %s %s"\n',
      defaults.address, defaults.producerId, defaults.topic,
      defaults.interval, defaults.data)

    _.forOwn(help, function(desc, key) {
      console.log('  -%s: %s', key, desc)
    })
    /* eslint-enable no-console */

    // eslint-disable-next-line no-process-exit
    process.exit()
  }

  var level = argv.debug ? 'debug' : 'info'
  var plugin = new LoggerConsolePlugin({ level: level })
  Logger.use(plugin)

  return argv
}

module.exports = setup

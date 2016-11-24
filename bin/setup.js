var util = require('util')
var _ = require('lodash')
var Logger = require('logger-facade-nodejs')
var LoggerConsolePlugin = require('logger-facade-console-plugin-nodejs')


function setup(command, help, defaults) {
  var argv = require('minimist')(process.argv.slice(2))

  if (argv.help) {
    /* eslint-disable no-console */
    console.log('\nUsage:')
    console.log('\nWith default values')
    console.log(' $ ' + command + " " + (defaults.data || []).join(' '))

    console.log('\nWith debug level')
    console.log(' $ ' + command  + " " + (defaults.data || []).join(' ') + ' --debug')

    console.log('\nWith parameters')
    var example = ' $ ' + command
    _.forOwn(help, function(desc, key) {
      example += util.format(' -%s %s', key, defaults[key])
    })
    console.log(example + " " + (defaults.data || []).join(' ') + '\n')

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

var util = require('util')

// return the specified address with +1 or -1 in port
function getAddress(address, diff) {
  var addressParts = address.split(':')
  var protocol = addressParts[0]
  var addr = addressParts[1]
  var port = addressParts[2]
  var newPort = parseInt(port, 10) + diff
  return util.format('%s:%s:%s', protocol, addr, newPort)
}

module.exports = { get: getAddress }

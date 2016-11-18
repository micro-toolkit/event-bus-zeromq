var _ = require('lodash')
var fs = require('fs')

function save(filepath, data) {
  var json = JSON.stringify(data)
  fs.writeFileSync(filepath, json, 'utf8')
  return true
}

function read(filepath) {
  if (!fs.existsSync(filepath)) { return null }

  var data = fs.readFileSync(filepath, 'utf8')
  return JSON.parse(data)
}

function getInstance(filepath) {
  if (!filepath || typeof filepath !== 'string') {
    throw new Error('A valid filepath is required')
  }

  return {
    read: _.partial(read, filepath),
    save: _.partial(save, filepath)
  }
}

module.exports = { getInstance: getInstance }

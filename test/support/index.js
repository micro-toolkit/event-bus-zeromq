var chai = require('chai')
var sinon = require('sinon')

chai.config.includeStack = true

global.should = chai.should()
global.sinon = sinon

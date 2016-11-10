var chai = require('chai')
var sinon = require('sinon')
var sinonChai = require("sinon-chai")
chai.use(sinonChai)

chai.config.includeStack = true

global.should = chai.should()
global.sinon = sinon

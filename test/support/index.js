var chai = require('chai')
var sinon = require('sinon')
var sinonChai = require("sinon-chai")
chai.use(sinonChai)

chai.config.includeStack = true

var testConfig = {
  supportDirPath: __dirname
}

global.should = chai.should()
global.sinon = sinon
global.match = sinon.match
global.testConfig = testConfig

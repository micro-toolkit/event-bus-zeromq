var sinon = require('sinon')

function getLogStub() {
  return {
    debug: sinon.spy(),
    info: sinon.spy(),
    trace: sinon.spy(),
    warn: sinon.spy(),
    error: sinon.spy()
  }
}
module.exports = {
  getLogStub: getLogStub
}

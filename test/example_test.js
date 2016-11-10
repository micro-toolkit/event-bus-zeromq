var target = require('../index')

describe('Example spec', function () {
  it('should pass', function () {
    target().should.be.eql("hello")
  })
})

var address = require('../lib/address')

describe('Address Module', function () {
  it('should return address + 1', function () {
    var actual = address.get('tcp://127.0.0.1:5557', 1)
    actual.should.be.eql('tcp://127.0.0.1:5558')
  })

  it('should return address - 1', function () {
    var actual = address.get('tcp://127.0.0.1:5557', -1)
    actual.should.be.eql('tcp://127.0.0.1:5556')
  })
})

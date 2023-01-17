const { assert } = require('chai')
require('chai').use(require('chai-as-promised')).should()
const Marketplace = artifacts.require('./Marketplace.sol')

contract('Marketplace', ([deployer, seller, buyer]) => {
  let marketplace

  before(async () => {
    marketplace = await Marketplace.deployed()
  })

  describe('deployment', async () => {
    it('deploys successfully', async () => {
      const address = await marketplace.address
      assert.notEqual(address, 0x0)
      assert.notEqual(address, '')
      assert.notEqual(address, null)
      assert.notEqual(address, undefined)
    })
    it('has a name', async () => {
      const name = await marketplace.name()
      assert.equal(name, 'Dapp University Marketplace')
    })
  })

  describe('products', async () => {
    let result, productCount

    before(async () => {
      result = await marketplace.createProduct(
        'iPhone',
        web3.utils.toWei('1', 'Ether'),
        { from: seller },
      )
      productCount = await marketplace.productCount()
    })

    it('creates products', async () => {
      // SUCCESS
      assert.equal(productCount, 1)
      const event = result.logs[0].args
      assert.equal(
        event.id.toNumber(),
        productCount.toNumber(),
        'id is correct',
      )
      assert.equal(event.name, 'iPhone', 'name is correct')
      assert.equal(event.price, '1000000000000000000', 'price is correct')
      assert.equal(event.owner, seller, 'owner is correct')
      assert.equal(event.purchased, false, 'purchased is correct')

      // FAILURE: Product must have a name
      await await marketplace.createProduct(
        '',
        web3.utils.toWei('1', 'Ether'),
        { from: seller },
      ).should.be.rejected

      // FAILURE: Product must have a name
      await await marketplace.createProduct('iPhone', 0, { from: seller })
        .should.be.rejected
    })

    it('list products', async () => {
      const products = await marketplace.products(productCount)
      assert.equal(products.id.toNumber(),productCount.toNumber(),'id is correct')
      assert.equal(products.name, 'iPhone', 'name is correct')
      assert.equal(products.price, '1000000000000000000', 'price is correct')
      assert.equal(products.owner, seller, 'owner is correct')
      assert.equal(products.purchased, false, 'purchased is correct')
    })

    it('sells products', async () => {
        // Track the seller balance before purchase
        let oldSellerBalance;
        oldSellerBalance = await web3.eth.getBalance(seller);
        oldSellerBalance = new web3.utils.BN(oldSellerBalance);
        
        // SUCCESS: Buyer makes purchase
        const result = await marketplace.purchaseProduct(productCount, {from: buyer, value: web3.utils.toWei('1', 'Ether')});
        
        // Check logs
        const event = result.logs[0].args
      
        assert.equal(event.id.toNumber(),productCount.toNumber(),'id is correct')
        assert.equal(event.name, 'iPhone', 'name is correct')
        assert.equal(event.price, '1000000000000000000', 'price is correct')
        assert.equal(event.owner, buyer, 'owner is correct')
        assert.equal(event.purchased, true, 'purchased is correct')
        
        // Check that seller received funds
        let newSellerBalance;
        newSellerBalance = await web3.eth.getBalance(seller);
        newSellerBalance = new web3.utils.BN(newSellerBalance);
        
        let price = web3.utils.toWei('1', 'Ether');
        price = new web3.utils.BN(price);

        const expectedBalance = oldSellerBalance.add(price);
        assert.equal(newSellerBalance.toString(), expectedBalance.toString());
        
        // Failure: Tries to buy a product that does not exist, i.e. product must have a valid id
        await marketplace.purchaseProduct(99, {from: buyer, value: web3.utils.toWei('1', 'Ether')}).should.be.rejected;
        
        // Failure: Buyer tries to buy without enough Ether
        await marketplace.purchaseProduct(productCount, {from: buyer, value: web3.utils.toWei('0.5', 'Ether')}).should.be.rejected;
        
        // Failure: Buyer tries to buy without enough Ether
        await marketplace.purchaseProduct(productCount, {from: deployer, value: web3.utils.toWei('1', 'Ether')}).should.be.rejected;
        
        // Failure: Buyer tries to buy without enough Ether
        await marketplace.purchaseProduct(productCount, {from: buyer, value: web3.utils.toWei('1', 'Ether')}).should.be.rejected;
        
    })
  })
})

const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { shouldBehaveLikeERC2981 } = require('../../common/ERC2981.behavior');

const royalty = 200n;
const salePrice = 1000n;

const initialURI = 'https://token-cdn-domain/{id}.json';

const tokenId1 = 1n;
const tokenId2 = 2n;
const mintValue = 100n;

const tokenBatchIds = [3n, 4n, 5n];
const mintValues = [200n, 1000n, 42n];
const royaltyValues = [100n, 300n, 400n];

const data = '0x12345678';

async function fixture() {
  const [account1, account2, recipient] = await ethers.getSigners();

  const token = await ethers.deployContract('$ERC1155Royalty', [initialURI]);
  await token.$_mint(account1, tokenId1, mintValue, data);
  await token.$_mint(account1, tokenId2, mintValue, data);

  return { account1, account2, recipient, token };
}

describe('ERC1155Royalty', function () {
  beforeEach(async function () {
    Object.assign(
      this,
      await loadFixture(fixture),
      { tokenId1, tokenId2, royalty, salePrice }, // set for behavior tests
    );
  });

  describe('token specific functions', function () {
    beforeEach(async function () {
      await this.token.$_setTokenRoyalty(tokenId1, this.recipient, royalty);
    });

    it('royalty information are kept during burn and re-mint', async function () {
      await this.token.$_burn(this.account1, tokenId1, mintValue);

      expect(await this.token.royaltyInfo(tokenId1, salePrice)).to.deep.equal([
        this.recipient.address,
        (salePrice * royalty) / 10000n,
      ]);

      await this.token.$_mint(this.account2, tokenId1, mintValue, data);

      expect(await this.token.royaltyInfo(tokenId1, salePrice)).to.deep.equal([
        this.recipient.address,
        (salePrice * royalty) / 10000n,
      ]);
    });
  });

  describe('_mintBatchWithRoyalties', function () {
    it('revert if royalties lenght not math', async function () {
        await expect(this.token.$_mintBatchWithRoyalties(this.recipient, this.account1, tokenBatchIds, mintValues, royaltyValues.slice(1), data))
        .to.be.revertedWithCustomError(this.token, 'ERC1155InvalidArrayLength')
          .withArgs(tokenBatchIds.length, royaltyValues.length - 1);
    });

    it('emits a TransferBatch event', async function () {
        await expect(this.token.$_mintBatchWithRoyalties(this.recipient, this.account1, tokenBatchIds, mintValues, royaltyValues, data))
        .to.emit(this.token, 'TransferBatch')
          .withArgs(this.account1, ethers.ZeroAddress, this.account1, tokenBatchIds, mintValues);
    });

    it('emits a TransferBatchWithRoyaltiesSet event', async function () {
        await expect(this.token.$_mintBatchWithRoyalties(this.recipient, this.account1, tokenBatchIds, mintValues, royaltyValues, data))
        .to.emit(this.token, 'TransferBatchWithRoyaltiesSet')
          .withArgs(this.account1, ethers.ZeroAddress, this.account1, tokenBatchIds, mintValues, royaltyValues);
    });

    it('royalty information are set after mintBatchWithRoyalties for each token individually', async function () {
        await this.token.$_mintBatchWithRoyalties(this.recipient, this.account1, tokenBatchIds, mintValues, royaltyValues, data);
        for (let index = 0; index < tokenBatchIds.length; index++) {
            expect(await this.token.royaltyInfo(tokenBatchIds[index], salePrice)).to.deep.equal([
                this.recipient.address,
                (salePrice * royaltyValues[index]) / 10000n,
            ]);
        }
    });
  });

  shouldBehaveLikeERC2981();
});
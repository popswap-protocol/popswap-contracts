const { expect } = require("chai");

describe("Popswap", function() {
  it("Should allow a trade to be cancelled before it is successful or expired", async function() {
    const [owner, addr1] = await ethers.getSigners();

    const ERC721 = await hre.ethers.getContractFactory("ERC721");

    const nifty = await ERC721.deploy("NIFTY", "NFT", owner.address, 420);
    await nifty.deployed();

    const soda = await ERC721.deploy("SODAPOP", "SODA", addr1.address, 777);
    await soda.deployed();

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy("0xe8256119a8621a6ba3c42e807b261840bde77944");
    await popswap.deployed();

    await popswap.openNewTrade(
      nifty.address,
      420,
      soda.address,
      777,
      Math.floor((new Date().getTime() + (1000 * 60 * 60)) / 1000)
    );

    await popswap.cancelTrade("0");

    const tradeItem = await popswap.getTradeByTradeId("0");

    expect(tradeItem[9]).to.equal(false);
  });
  it("Should not allow a trade to be opened with an expiry before the current blocktime", async function() {
    const [owner, addr1] = await ethers.getSigners();

    const ERC721 = await hre.ethers.getContractFactory("ERC721");

    const nifty = await ERC721.deploy("NIFTY", "NFT", owner.address, 420);
    await nifty.deployed();

    const soda = await ERC721.deploy("SODAPOP", "SODA", addr1.address, 777);
    await soda.deployed();

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy("0xe8256119a8621a6ba3c42e807b261840bde77944");
    await popswap.deployed();

    await expect(popswap.openNewTrade(
      nifty.address,
      420,
      soda.address,
      777,
      Math.floor(new Date().getTime() / 1000)
    )).to.be.revertedWith("Popswap::openNewTrade: _expiryDate must be after current block.timestamp");

  });
  it("Should not allow a trade to be cancelled once it has expired", async function() {
    const [owner, addr1] = await ethers.getSigners();

    const ERC721 = await hre.ethers.getContractFactory("ERC721");

    const nifty = await ERC721.deploy("NIFTY", "NFT", owner.address, 420);
    await nifty.deployed();

    const soda = await ERC721.deploy("SODAPOP", "SODA", addr1.address, 777);
    await soda.deployed();

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy("0xe8256119a8621a6ba3c42e807b261840bde77944");
    await popswap.deployed();

    await popswap.openNewTrade(
      nifty.address,
      420,
      soda.address,
      777,
      Math.floor((new Date().getTime() + 15000) / 1000)
    );

    setTimeout(async () => {
      await expect(popswap.cancelTrade("0")).to.be.revertedWith("Popswap::openNewTrade: _expiryDate must be after current block.timestamp");
    }, 15000)
  });
  it("Should allow opening a trade for an ERC721 token", async function() {
    const [owner, addr1] = await ethers.getSigners();

    const ERC721 = await hre.ethers.getContractFactory("ERC721");

    const nifty = await ERC721.deploy("NIFTY", "NFT", owner.address, 420);
    await nifty.deployed();

    const soda = await ERC721.deploy("SODAPOP", "SODA", addr1.address, 777);
    await soda.deployed();

    const balanceOfOrderOpenerOpeningTokenBeforeTrade = await nifty.balanceOf(owner.address);

    await expect(balanceOfOrderOpenerOpeningTokenBeforeTrade.toString()).to.equal('1');

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy("0xe8256119a8621a6ba3c42e807b261840bde77944");
    await popswap.deployed();

    let didCreationError = false;

    try {
      await popswap.openNewTrade(
        nifty.address,
        420,
        soda.address,
        777,
        Math.floor((new Date().getTime() + (1000 * 60 * 60)) / 1000)
      )
    }catch(e) {
      didCreationError = true;
    }

    await expect(didCreationError).to.be.false;

    const tradeItem = await popswap.getTradeByTradeId("0");

    await expect(tradeItem).to.have.lengthOf(10) // Length of Trade struct
    
  });
  it("Should allow opening a trade for an ERC1155 token", async function() {
    const [owner, addr1] = await ethers.getSigners();

    const ERC1155 = await hre.ethers.getContractFactory("ERC1155");

    const seen = await ERC1155.deploy("seen1155", owner.address, 10);
    await seen.deployed();

    const nftx = await ERC1155.deploy("nftx1155", addr1.address, 13);
    await nftx.deployed();

    const balanceOfOrderOpenerOpeningTokenBeforeTrade = await seen.balanceOf(owner.address, 10);

    await expect(balanceOfOrderOpenerOpeningTokenBeforeTrade).to.equal("1");

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy("0xe8256119a8621a6ba3c42e807b261840bde77944");
    await popswap.deployed();

    let didCreationError = false;

    try {
      await popswap.openNewTrade(
        seen.address,
        10,
        nftx.address,
        13,
        Math.floor((new Date().getTime() + (1000 * 60 * 60)) / 1000)
      )
    }catch(e) {
      didCreationError = true;
    }

    await expect(didCreationError).to.be.false;

    const tradeItem = await popswap.getTradeByTradeId("0");

    await expect(tradeItem).to.have.lengthOf(10) // Length of Trade struct
    
  });
  it("Should allow closing a ERC712 <-> ERC721 trade for the requested, approved & owned ERC721 token", async function() {
    const [owner, addr1] = await ethers.getSigners();

    const ERC721 = await hre.ethers.getContractFactory("ERC721");

    const nifty = await ERC721.deploy("NIFTY", "NFT", owner.address, 420);
    await nifty.deployed();

    const soda = await ERC721.deploy("SODAPOP", "SODA", addr1.address, 777);
    await soda.deployed();

    const balanceOfOrderOpenerOpeningTokenBeforeTrade = await nifty.balanceOf(owner.address);
    const balanceOfOrderCloserOpeningTokenBeforeTrade = await nifty.balanceOf(addr1.address);
    const balanceOfOrderOpenerClosingTokenBeforeTrade = await soda.balanceOf(owner.address);
    const balanceOfOrderCloserClosingTokenBeforeTrade = await soda.balanceOf(addr1.address);

    await expect(balanceOfOrderOpenerOpeningTokenBeforeTrade.toString()).to.equal('1');
    await expect(balanceOfOrderOpenerClosingTokenBeforeTrade.toString()).to.equal('0');
    await expect(balanceOfOrderCloserOpeningTokenBeforeTrade.toString()).to.equal('0');
    await expect(balanceOfOrderCloserClosingTokenBeforeTrade.toString()).to.equal('1');

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy("0xe8256119a8621a6ba3c42e807b261840bde77944");
    await popswap.deployed();

    let didCreationError = false;

    try {
      await popswap.openNewTrade(
        nifty.address,
        420,
        soda.address,
        777,
        Math.floor((new Date().getTime() + (1000 * 60 * 60)) / 1000)
      )
    }catch(e) {
      didCreationError = true;
    }

    await expect(didCreationError).to.be.false;

    let approvalOpeningTokenError = false;

    try {
      await nifty.setApprovalForAll(popswap.address, true);
    }catch(e) {
      approvalOpeningTokenError = true;
    }

    await expect(approvalOpeningTokenError).to.be.false;

    let approvalClosingTokenError = false;

    try {
      await soda.connect(addr1).setApprovalForAll(popswap.address, true);
    }catch(e) {
      approvalClosingTokenError = true;
    }

    await expect(approvalClosingTokenError).to.be.false;

    let tradeExecutionError = false;

    try {
      await popswap.connect(addr1).executeTrade("0", "0", "0");
    }catch(e){
      console.log({e})
      tradeExecutionError = true;
    }

    await expect(tradeExecutionError).to.be.false;

    const balanceOfOrderOpenerOpeningTokenAfterTrade = await nifty.balanceOf(owner.address);
    const balanceOfOrderCloserOpeningTokenAfterTrade = await nifty.balanceOf(addr1.address);
    const balanceOfOrderOpenerClosingTokenAfterTrade = await soda.balanceOf(owner.address);
    const balanceOfOrderCloserClosingTokenAfterTrade = await soda.balanceOf(addr1.address);

    await expect(balanceOfOrderOpenerOpeningTokenAfterTrade.toString()).to.equal('0');
    await expect(balanceOfOrderOpenerClosingTokenAfterTrade.toString()).to.equal('1');
    await expect(balanceOfOrderCloserOpeningTokenAfterTrade.toString()).to.equal('1');
    await expect(balanceOfOrderCloserClosingTokenAfterTrade.toString()).to.equal('0');
    
  });
  it("Should allow closing a ERC1155 <-> ERC1155 trade for the requested, approved & owned ERC1155 token", async function() {
    const [owner, addr1] = await ethers.getSigners();

    const ERC1155 = await hre.ethers.getContractFactory("ERC1155");

    const seen = await ERC1155.deploy("test", owner.address, 10);
    await seen.deployed();

    const nftx = await ERC1155.deploy("test2", addr1.address, 13);
    await nftx.deployed();

    const balanceOfOrderOpenerOpeningTokenBeforeTrade = await seen.balanceOf(owner.address, 10);
    const balanceOfOrderCloserOpeningTokenBeforeTrade = await seen.balanceOf(addr1.address, 10);
    const balanceOfOrderOpenerClosingTokenBeforeTrade = await nftx.balanceOf(owner.address, 13);
    const balanceOfOrderCloserClosingTokenBeforeTrade = await nftx.balanceOf(addr1.address, 13);

    await expect(balanceOfOrderOpenerOpeningTokenBeforeTrade.toString()).to.equal('1');
    await expect(balanceOfOrderOpenerClosingTokenBeforeTrade.toString()).to.equal('0');
    await expect(balanceOfOrderCloserOpeningTokenBeforeTrade.toString()).to.equal('0');
    await expect(balanceOfOrderCloserClosingTokenBeforeTrade.toString()).to.equal('1');

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy("0xe8256119a8621a6ba3c42e807b261840bde77944");
    await popswap.deployed();

    let didCreationError = false;

    try {
      await popswap.openNewTrade(
        seen.address,
        10,
        nftx.address,
        13,
        Math.floor((new Date().getTime() + (1000 * 60 * 60)) / 1000)
      )
    }catch(e) {
      didCreationError = true;
    }

    await expect(didCreationError).to.be.false;

    let approvalOpeningTokenError = false;

    try {
      await seen.setApprovalForAll(popswap.address, true);
    }catch(e) {
      approvalOpeningTokenError = true;
    }

    await expect(approvalOpeningTokenError).to.be.false;

    let approvalClosingTokenError = false;

    try {
      await nftx.connect(addr1).setApprovalForAll(popswap.address, true);
    }catch(e) {
      approvalClosingTokenError = true;
    }

    await expect(approvalClosingTokenError).to.be.false;

    let tradeExecutionError = false;

    try {
      await popswap.connect(addr1).executeTrade("0", "1", "1");
    }catch(e){
      console.log({e})
      tradeExecutionError = true;
    }

    await expect(tradeExecutionError).to.be.false;

    const balanceOfOrderOpenerOpeningTokenAfterTrade = await seen.balanceOf(owner.address, 10);
    const balanceOfOrderCloserOpeningTokenAfterTrade = await seen.balanceOf(addr1.address, 10);
    const balanceOfOrderOpenerClosingTokenAfterTrade = await nftx.balanceOf(owner.address, 13);
    const balanceOfOrderCloserClosingTokenAfterTrade = await nftx.balanceOf(addr1.address, 13);

    await expect(balanceOfOrderOpenerOpeningTokenAfterTrade.toString()).to.equal('0');
    await expect(balanceOfOrderCloserOpeningTokenAfterTrade.toString()).to.equal('1');
    await expect(balanceOfOrderOpenerClosingTokenAfterTrade.toString()).to.equal('1');
    await expect(balanceOfOrderCloserClosingTokenAfterTrade.toString()).to.equal('0');
    
  });
  it("Should allow closing a ERC721 <-> ERC1155 trade for the requested, approved & owned ERC1155 token", async function() {
    const [owner, addr1] = await ethers.getSigners();

    const ERC1155 = await hre.ethers.getContractFactory("ERC1155");
    const ERC721 = await hre.ethers.getContractFactory("ERC721");

    const nifty = await ERC721.deploy("NIFTY", "NFT", owner.address, 420);
    await nifty.deployed();

    const nftx = await ERC1155.deploy("test2", addr1.address, 13);
    await nftx.deployed();

    const balanceOfOrderOpenerOpeningTokenBeforeTrade = await nifty.balanceOf(owner.address);
    const balanceOfOrderCloserOpeningTokenBeforeTrade = await nifty.balanceOf(addr1.address);
    const balanceOfOrderOpenerClosingTokenBeforeTrade = await nftx.balanceOf(owner.address, 13);
    const balanceOfOrderCloserClosingTokenBeforeTrade = await nftx.balanceOf(addr1.address, 13);

    await expect(balanceOfOrderOpenerOpeningTokenBeforeTrade.toString()).to.equal('1');
    await expect(balanceOfOrderOpenerClosingTokenBeforeTrade.toString()).to.equal('0');
    await expect(balanceOfOrderCloserOpeningTokenBeforeTrade.toString()).to.equal('0');
    await expect(balanceOfOrderCloserClosingTokenBeforeTrade.toString()).to.equal('1');

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy("0xe8256119a8621a6ba3c42e807b261840bde77944");
    await popswap.deployed();

    let didCreationError = false;

    try {
      await popswap.openNewTrade(
        nifty.address,
        420,
        nftx.address,
        13,
        Math.floor((new Date().getTime() + (1000 * 60 * 60)) / 1000)
      )
    }catch(e) {
      didCreationError = true;
    }

    await expect(didCreationError).to.be.false;

    let approvalOpeningTokenError = false;

    try {
      await nifty.setApprovalForAll(popswap.address, true);
    }catch(e) {
      approvalOpeningTokenError = true;
    }

    await expect(approvalOpeningTokenError).to.be.false;

    let approvalClosingTokenError = false;

    try {
      await nftx.connect(addr1).setApprovalForAll(popswap.address, true);
    }catch(e) {
      approvalClosingTokenError = true;
    }

    await expect(approvalClosingTokenError).to.be.false;

    let tradeExecutionError = false;

    try {
      await popswap.connect(addr1).executeTrade("0", "0", "1");
    }catch(e){
      console.log({e})
      tradeExecutionError = true;
    }

    await expect(tradeExecutionError).to.be.false;

    const balanceOfOrderOpenerOpeningTokenAfterTrade = await nifty.balanceOf(owner.address);
    const balanceOfOrderCloserOpeningTokenAfterTrade = await nifty.balanceOf(addr1.address);
    const balanceOfOrderOpenerClosingTokenAfterTrade = await nftx.balanceOf(owner.address, 13);
    const balanceOfOrderCloserClosingTokenAfterTrade = await nftx.balanceOf(addr1.address, 13);

    await expect(balanceOfOrderOpenerOpeningTokenAfterTrade.toString()).to.equal('0');
    await expect(balanceOfOrderCloserOpeningTokenAfterTrade.toString()).to.equal('1');
    await expect(balanceOfOrderOpenerClosingTokenAfterTrade.toString()).to.equal('1');
    await expect(balanceOfOrderCloserClosingTokenAfterTrade.toString()).to.equal('0');
    
  });
  it("Should allow closing a ERC1155 <-> ERC721 trade for the requested, approved & owned ERC721 token", async function() {
    const [owner, addr1] = await ethers.getSigners();

    const ERC1155 = await hre.ethers.getContractFactory("ERC1155");
    const ERC721 = await hre.ethers.getContractFactory("ERC721");

    const seen = await ERC1155.deploy("test", owner.address, 10);
    await seen.deployed();

    const soda = await ERC721.deploy("SODAPOP", "SODA", addr1.address, 777);
    await soda.deployed();

    const balanceOfOrderOpenerOpeningTokenBeforeTrade = await seen.balanceOf(owner.address, 10);
    const balanceOfOrderCloserOpeningTokenBeforeTrade = await seen.balanceOf(addr1.address, 10);
    const balanceOfOrderOpenerClosingTokenBeforeTrade = await soda.balanceOf(owner.address);
    const balanceOfOrderCloserClosingTokenBeforeTrade = await soda.balanceOf(addr1.address);

    await expect(balanceOfOrderOpenerOpeningTokenBeforeTrade.toString()).to.equal('1');
    await expect(balanceOfOrderOpenerClosingTokenBeforeTrade.toString()).to.equal('0');
    await expect(balanceOfOrderCloserOpeningTokenBeforeTrade.toString()).to.equal('0');
    await expect(balanceOfOrderCloserClosingTokenBeforeTrade.toString()).to.equal('1');

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy("0xe8256119a8621a6ba3c42e807b261840bde77944");
    await popswap.deployed();

    let didCreationError = false;

    try {
      await popswap.openNewTrade(
        seen.address,
        10,
        soda.address,
        777,
        Math.floor((new Date().getTime() + (1000 * 60 * 60)) / 1000)
      )
    }catch(e) {
      didCreationError = true;
    }

    await expect(didCreationError).to.be.false;

    let approvalOpeningTokenError = false;

    try {
      await seen.setApprovalForAll(popswap.address, true);
    }catch(e) {
      approvalOpeningTokenError = true;
    }

    await expect(approvalOpeningTokenError).to.be.false;

    let approvalClosingTokenError = false;

    try {
      await soda.connect(addr1).setApprovalForAll(popswap.address, true);
    }catch(e) {
      approvalClosingTokenError = true;
    }

    await expect(approvalClosingTokenError).to.be.false;

    let tradeExecutionError = false;

    try {
      await popswap.connect(addr1).executeTrade("0", "1", "0");
    }catch(e){
      console.log({e})
      tradeExecutionError = true;
    }

    await expect(tradeExecutionError).to.be.false;

    const balanceOfOrderOpenerOpeningTokenAfterTrade = await seen.balanceOf(owner.address, 10);
    const balanceOfOrderCloserOpeningTokenAfterTrade = await seen.balanceOf(addr1.address, 10);
    const balanceOfOrderOpenerClosingTokenAfterTrade = await soda.balanceOf(owner.address);
    const balanceOfOrderCloserClosingTokenAfterTrade = await soda.balanceOf(addr1.address);

    await expect(balanceOfOrderOpenerOpeningTokenAfterTrade.toString()).to.equal('0');
    await expect(balanceOfOrderCloserOpeningTokenAfterTrade.toString()).to.equal('1');
    await expect(balanceOfOrderOpenerClosingTokenAfterTrade.toString()).to.equal('1');
    await expect(balanceOfOrderCloserClosingTokenAfterTrade.toString()).to.equal('0');
    
  });
});

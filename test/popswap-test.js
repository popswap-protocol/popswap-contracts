const { expect } = require("chai");

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

describe("Popswap", function() {
  // First test takes ~ 20 seconds
  it("Should change isTradeExecutable result once trade expires & shouldn't allow cancelling an expired trade", async function() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const ERC721 = await hre.ethers.getContractFactory("ERC721");

    const nifty = await ERC721.deploy("NIFTY", "NFT", owner.address, 420);
    await nifty.deployed();

    const soda = await ERC721.deploy("SODAPOP", "SODA", addr1.address, 777);
    await soda.deployed();

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy(addr2.address);
    await popswap.deployed();

    let didCreationError = false;

    try {
      await popswap.openNewTrade(
        nifty.address,
        420,
        soda.address,
        777,
        Math.floor((new Date().getTime() + 15000) / 1000)
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

    let isTradeExecutablePreExpiry = await popswap.connect(addr1).isTradeExecutable("0", "0", "0");
    await expect(isTradeExecutablePreExpiry).to.be.true;

    await wait(20000);

    await expect(popswap.cancelTrade("0")).to.be.revertedWith("Popswap::cancelTrade: trade.expiryDate must be after current block.timestamp");

    let isTradeExecutablePostExpiry = await popswap.connect(addr1).isTradeExecutable("0", "0", "0");
    await expect(isTradeExecutablePostExpiry).to.be.false;
  }).timeout(30000);
  it("Should retrieve a dev fund which is the same as the provided address in constructor", async function() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy(addr2.address);
    await popswap.deployed();

    const devFund = await popswap.devFund();

    await expect(devFund).to.equal(addr2.address);
  });
  it("Should allow a trade to be cancelled before it is successful or expired", async function() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const ERC721 = await hre.ethers.getContractFactory("ERC721");

    const nifty = await ERC721.deploy("NIFTY", "NFT", owner.address, 420);
    await nifty.deployed();

    const soda = await ERC721.deploy("SODAPOP", "SODA", addr1.address, 777);
    await soda.deployed();

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy(addr2.address);
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

    await expect(tradeItem[9]).to.equal(false);
  });
  it("Should not allow a trade to be opened with an expiry before the current blocktime", async function() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const ERC721 = await hre.ethers.getContractFactory("ERC721");

    const nifty = await ERC721.deploy("NIFTY", "NFT", owner.address, 420);
    await nifty.deployed();

    const soda = await ERC721.deploy("SODAPOP", "SODA", addr1.address, 777);
    await soda.deployed();

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy(addr2.address);
    await popswap.deployed();

    await expect(popswap.openNewTrade(
      nifty.address,
      420,
      soda.address,
      777,
      Math.floor(new Date().getTime() / 1000)
    )).to.be.revertedWith("Popswap::openNewTrade: _expiryDate must be after current block.timestamp");

  });
  it("Should change isTradeExecutable result if openingToken owner transfers their openingToken after opening trade & approving Popswap (ERC721)", async function() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const ERC721 = await hre.ethers.getContractFactory("ERC721");

    const nifty = await ERC721.deploy("NIFTY", "NFT", owner.address, 420);
    await nifty.deployed();

    const soda = await ERC721.deploy("SODAPOP", "SODA", addr1.address, 777);
    await soda.deployed();

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy(addr2.address);
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

    let isTradeExecutablePreTransfer = await popswap.connect(addr1).isTradeExecutable("0", "0", "0");
    await expect(isTradeExecutablePreTransfer).to.be.true;

    await nifty.transferFrom(owner.address, addr2.address, 420)

    let isTradeExecutablePostTransfer = await popswap.connect(addr1).isTradeExecutable("0", "0", "0");
    await expect(isTradeExecutablePostTransfer).to.be.false;

  });
  it("Should change isTradeExecutable result if openingToken owner transfers their openingToken after opening trade & approving Popswap (ERC1155)", async function() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const ERC1155 = await hre.ethers.getContractFactory("ERC1155");

    const seen = await ERC1155.deploy("test", owner.address, 10);
    await seen.deployed();

    const nftx = await ERC1155.deploy("test2", addr1.address, 13);
    await nftx.deployed();

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy(addr2.address);
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

    let isTradeExecutablePreTransfer = await popswap.connect(addr1).isTradeExecutable("0", "1", "1");
    await expect(isTradeExecutablePreTransfer).to.be.true;

    await seen.safeTransferFrom(owner.address, addr2.address, 10, 1, 0x0000000000000000000000000000000000000000000000000000000000000000)

    let isTradeExecutablePostTransfer = await popswap.connect(addr1).isTradeExecutable("0", "1", "1");
    await expect(isTradeExecutablePostTransfer).to.be.false;

  });
  it("Should change isTradeExecutable result if closingToken owner transfers their closingToken after approving Popswap (ERC721)", async function() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const ERC721 = await hre.ethers.getContractFactory("ERC721");

    const nifty = await ERC721.deploy("NIFTY", "NFT", owner.address, 420);
    await nifty.deployed();

    const soda = await ERC721.deploy("SODAPOP", "SODA", addr1.address, 777);
    await soda.deployed();

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy(addr2.address);
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

    let isTradeExecutablePreTransfer = await popswap.connect(addr1).isTradeExecutable("0", "0", "0");
    await expect(isTradeExecutablePreTransfer).to.be.true;

    await soda.connect(addr1).transferFrom(addr1.address, addr2.address, 777)

    let isTradeExecutablePostTransfer = await popswap.connect(addr1).isTradeExecutable("0", "0", "0");
    await expect(isTradeExecutablePostTransfer).to.be.false;

  });
  it("Should change isTradeExecutable result if closingToken owner transfers their closingToken after approving Popswap (ERC1155)", async function() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const ERC1155 = await hre.ethers.getContractFactory("ERC1155");

    const seen = await ERC1155.deploy("test", owner.address, 10);
    await seen.deployed();

    const nftx = await ERC1155.deploy("test2", addr1.address, 13);
    await nftx.deployed();

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy(addr2.address);
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

    let isTradeExecutablePreTransfer = await popswap.connect(addr1).isTradeExecutable("0", "1", "1");
    await expect(isTradeExecutablePreTransfer).to.be.true;

    await nftx.connect(addr1).safeTransferFrom(addr1.address, addr2.address, 13, 1, 0x0000000000000000000000000000000000000000000000000000000000000000)

    let isTradeExecutablePostTransfer = await popswap.connect(addr1).isTradeExecutable("0", "1", "1");
    await expect(isTradeExecutablePostTransfer).to.be.false;

  });
  it("Should allow opening a trade for an ERC721 token", async function() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const ERC721 = await hre.ethers.getContractFactory("ERC721");

    const nifty = await ERC721.deploy("NIFTY", "NFT", owner.address, 420);
    await nifty.deployed();

    const soda = await ERC721.deploy("SODAPOP", "SODA", addr1.address, 777);
    await soda.deployed();

    const balanceOfOrderOpenerOpeningTokenBeforeTrade = await nifty.balanceOf(owner.address);

    await expect(balanceOfOrderOpenerOpeningTokenBeforeTrade.toString()).to.equal('1');

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy(addr2.address);
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

    let isTradeExecutable = await popswap.isTradeExecutable("0", "0", "0");
    await expect(isTradeExecutable).to.be.false;

  });
  it("Should increment the trade count by 1 when a new trade is opened", async function() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const ERC721 = await hre.ethers.getContractFactory("ERC721");

    const nifty = await ERC721.deploy("NIFTY", "NFT", owner.address, 420);
    await nifty.deployed();

    const soda = await ERC721.deploy("SODAPOP", "SODA", addr1.address, 777);
    await soda.deployed();

    const balanceOfOrderOpenerOpeningTokenBeforeTrade = await nifty.balanceOf(owner.address);

    await expect(balanceOfOrderOpenerOpeningTokenBeforeTrade.toString()).to.equal('1');

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy(addr2.address);
    await popswap.deployed();

    const tradeLengthStart = await popswap.getTradeCount();
    await expect(tradeLengthStart).to.equal(0);

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

    const tradeLengthAfterTradeOpening = await popswap.getTradeCount();
    await expect(tradeLengthAfterTradeOpening).to.equal(1);

    const tradeItem = await popswap.getTradeByTradeId("0");

    await expect(tradeItem).to.have.lengthOf(10) // Length of Trade struct

    let isTradeExecutable = await popswap.isTradeExecutable("0", "0", "0");
    await expect(isTradeExecutable).to.be.false;

  });
  it("Should allow opening a trade for an ERC1155 token", async function() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const ERC1155 = await hre.ethers.getContractFactory("ERC1155");

    const seen = await ERC1155.deploy("seen1155", owner.address, 10);
    await seen.deployed();

    const nftx = await ERC1155.deploy("nftx1155", addr1.address, 13);
    await nftx.deployed();

    const balanceOfOrderOpenerOpeningTokenBeforeTrade = await seen.balanceOf(owner.address, 10);

    await expect(balanceOfOrderOpenerOpeningTokenBeforeTrade).to.equal("1");

    const Popswap = await hre.ethers.getContractFactory("Popswap");
    const popswap = await Popswap.deploy(addr2.address);
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

    let isTradeExecutable = await popswap.isTradeExecutable("0", "1", "1");
    await expect(isTradeExecutable).to.be.false;
    
  });
  it("Should allow closing a ERC712 <-> ERC721 trade for the requested, approved & owned ERC721 token", async function() {
    const [owner, addr1, addr2] = await ethers.getSigners();

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
    const popswap = await Popswap.deploy(addr2.address);
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

    let isTradeExecutablePreExecution = await popswap.connect(addr1).isTradeExecutable("0", "0", "0");
    await expect(isTradeExecutablePreExecution).to.be.true;

    let isTradeExecutablePreExecutionNoClosingOwnership = await popswap.isTradeExecutable("0", "0", "0");
    await expect(isTradeExecutablePreExecutionNoClosingOwnership).to.be.false;

    let tradeExecutionError = false;

    try {
      await popswap.connect(addr1).executeTrade("0", "0", "0");
    }catch(e){
      console.log({e})
      tradeExecutionError = true;
    }

    await expect(tradeExecutionError).to.be.false;

    let isTradeExecutablePostExecution = await popswap.connect(addr1).isTradeExecutable("0", "0", "0");
    await expect(isTradeExecutablePostExecution).to.be.false;

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
    const [owner, addr1, addr2] = await ethers.getSigners();

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
    const popswap = await Popswap.deploy(addr2.address);
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

    let isTradeExecutablePreExecution = await popswap.connect(addr1).isTradeExecutable("0", "1", "1");
    await expect(isTradeExecutablePreExecution).to.be.true;

    let isTradeExecutablePreExecutionNoClosingOwnership = await popswap.isTradeExecutable("0", "1", "1");
    await expect(isTradeExecutablePreExecutionNoClosingOwnership).to.be.false;

    let tradeExecutionError = false;

    try {
      await popswap.connect(addr1).executeTrade("0", "1", "1");
    }catch(e){
      console.log({e})
      tradeExecutionError = true;
    }

    await expect(tradeExecutionError).to.be.false;

    let isTradeExecutablePostExecution = await popswap.connect(addr1).isTradeExecutable("0", "1", "1");
    await expect(isTradeExecutablePostExecution).to.be.false;

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
    const [owner, addr1, addr2] = await ethers.getSigners();

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
    const popswap = await Popswap.deploy(addr2.address);
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

    let isTradeExecutablePreExecution = await popswap.connect(addr1).isTradeExecutable("0", "0", "1");
    await expect(isTradeExecutablePreExecution).to.be.true;

    let isTradeExecutablePreExecutionNoClosingOwnership = await popswap.isTradeExecutable("0", "0", "1");
    await expect(isTradeExecutablePreExecutionNoClosingOwnership).to.be.false;

    let tradeExecutionError = false;

    try {
      await popswap.connect(addr1).executeTrade("0", "0", "1");
    }catch(e){
      console.log({e})
      tradeExecutionError = true;
    }

    await expect(tradeExecutionError).to.be.false;

    let isTradeExecutablePostExecution = await popswap.connect(addr1).isTradeExecutable("0", "0", "1");
    await expect(isTradeExecutablePostExecution).to.be.false;

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
    const [owner, addr1, addr2] = await ethers.getSigners();

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
    const popswap = await Popswap.deploy(addr2.address);
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

    let isTradeExecutablePreExecution = await popswap.connect(addr1).isTradeExecutable("0", "1", "0");
    await expect(isTradeExecutablePreExecution).to.be.true;

    let isTradeExecutablePreExecutionNoClosingOwnership = await popswap.isTradeExecutable("0", "1", "0");
    await expect(isTradeExecutablePreExecutionNoClosingOwnership).to.be.false;

    let tradeExecutionError = false;

    try {
      await popswap.connect(addr1).executeTrade("0", "1", "0");
    }catch(e){
      console.log({e})
      tradeExecutionError = true;
    }

    await expect(tradeExecutionError).to.be.false;

    let isTradeExecutablePostExecution = await popswap.connect(addr1).isTradeExecutable("0", "1", "0");
    await expect(isTradeExecutablePostExecution).to.be.false;

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

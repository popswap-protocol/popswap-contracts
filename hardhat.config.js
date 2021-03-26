require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.7.3",
  networks: {
    goerli: {
      url: `https://goerli.infura.io/v3/f2f3d9b49a70477aa0ee08ae80a1fa09`,
      accounts: [``] // Private Key
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/f2f3d9b49a70477aa0ee08ae80a1fa09`,
      accounts: [``] // Private Key
    },
    kovan: {
      url: `https://kovan.infura.io/v3/f2f3d9b49a70477aa0ee08ae80a1fa09`,
      accounts: [``] // Private Key
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/f2f3d9b49a70477aa0ee08ae80a1fa09`,
      accounts: [``] // Private Key
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/f2f3d9b49a70477aa0ee08ae80a1fa09`,
      accounts: [``] // Private Key
    },
  }
};


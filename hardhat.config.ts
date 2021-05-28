import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  solidity: {
    version: "0.7.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      gasPrice: 0,
      forking: {
        url: process.env.ETH_RPC_MAINNET,
        blockNumber: 12476817,
      },
    },
    mainnet: {
      url: process.env.ETH_RPC_MAINNET,
    },
  },
};

if (process.env.ETH_RPC_GOERLI) {
  config.networks["goerli"] = {
    url: process.env.ETH_RPC_GOERLI,
  };
}

if (process.env.ETH_RPC_KOVAN) {
  config.networks["kovan"] = {
    url: process.env.ETH_RPC_KOVAN,
  };
}

if (process.env.ETHERSCAN_API_KEY) {
  config.etherscan = {
    apiKey: process.env.ETHERSCAN_API_KEY,
  };
}

if (process.env.GAS_PRICE) {
  const gasPrice = parseInt(process.env.GAS_PRICE) * 1e9

  // Safety check to not spend too much gas
  if (gasPrice > 500 * 1e9) {
    throw Error("Gas price too high");
  }

  config.networks.mainnet.gasPrice = gasPrice;
  if (config.networks.kovan) config.networks.kovan.gasPrice = gasPrice;
  if (config.networks.goerli) config.networks.goerli.gasPrice = gasPrice;
}

if (process.env.PRIV_KEY) {
  if (config.networks.kovan) config.networks.kovan.accounts = [process.env.PRIV_KEY];
  if (config.networks.goerli) config.networks.goerli.accounts = [process.env.PRIV_KEY];
}

export default config;

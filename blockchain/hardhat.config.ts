import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
    solidity: "0.8.20",
    networks: {
        localhost: {
            url: "http://127.0.0.1:8545",
        },
        // Add your testnet/mainnet config here:
        // sepolia: {
        //   url: process.env.SEPOLIA_RPC_URL || "",
        //   accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
        // },
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
};

export default config;

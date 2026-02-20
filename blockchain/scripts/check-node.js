const { JsonRpcProvider } = require('ethers');

async function main() {
    try {
        const provider = new JsonRpcProvider("http://127.0.0.1:8545");
        const network = await provider.getNetwork();
        console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
        const blockNumber = await provider.getBlockNumber();
        console.log(`Current block number: ${blockNumber}`);
    } catch (error) {
        console.error("Connection failed:", error.message);
    }
}

main();

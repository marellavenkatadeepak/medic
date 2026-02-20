
const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Checking balance for account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
        console.log("❌ Balance is strictly ZERO. Funding transaction likely not received.");
    } else {
        console.log("✅ Wallet has funds!");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

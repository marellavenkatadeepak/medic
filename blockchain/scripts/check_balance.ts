import { ethers } from "hardhat";

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        if (!deployer) {
            console.log("No account configured! Check your .env file.");
            return;
        }
        console.log(`Account: ${deployer.address}`);
        const balance = await ethers.provider.getBalance(deployer.address);
        console.log(`Balance: ${ethers.formatEther(balance)} SEP`);
    } catch (error) {
        console.error("Error checking balance:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

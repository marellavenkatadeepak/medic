import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Nonce:", await deployer.getNonce());

    // Basic prediction if nonce was 0 and 1
    const tokenAddr = ethers.getCreateAddress({ from: deployer.address, nonce: 0 });
    const registryAddr = ethers.getCreateAddress({ from: deployer.address, nonce: 1 });

    console.log(`PREDICTED_TOKEN=${tokenAddr}`);
    console.log(`PREDICTED_REGISTRY=${registryAddr}`);
}

main();

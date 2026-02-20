import { ethers } from "hardhat";

async function main() {
    console.log("Deploying MediChainRecords...");

    const MediChainRecords = await ethers.getContractFactory("MediChainRecords");
    const contract = await MediChainRecords.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log(`MediChainRecords deployed to: ${address}`);
    console.log("Save this address in your .env as NEXT_PUBLIC_CONTRACT_ADDRESS");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

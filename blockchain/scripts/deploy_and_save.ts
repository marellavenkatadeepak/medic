import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy ResearchToken
    const ResearchToken = await ethers.getContractFactory("ResearchToken");
    const token = await ResearchToken.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log(`ResearchToken deployed to: ${tokenAddress}`);

    // 2. Deploy StudyRegistry
    const StudyRegistry = await ethers.getContractFactory("StudyRegistry");
    const registry = await StudyRegistry.deploy(tokenAddress);
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();
    console.log(`StudyRegistry deployed to: ${registryAddress}`);

    // 3. Grant MINTER_ROLE to Registry
    const MINTER_ROLE = await token.MINTER_ROLE();
    const tx = await token.grantRole(MINTER_ROLE, registryAddress);
    await tx.wait();
    console.log("Granted MINTER_ROLE to StudyRegistry");

    // 4. Save to file
    // 4. Save to file
    const outputPath = path.join(__dirname, "../../frontend/.env.local");
    const envContent = `NEXT_PUBLIC_RESEARCH_TOKEN_ADDRESS=${tokenAddress}\nNEXT_PUBLIC_STUDY_REGISTRY_ADDRESS=${registryAddress}\n`;

    try {
        fs.writeFileSync(outputPath, envContent);
        console.log(`Addresses saved to ${outputPath}`);
    } catch (error) {
        console.error("Error saving addresses:", error);
    }

    console.log(" Deployment Complete!");
    console.log("ResearchToken:", tokenAddress);
    console.log("StudyRegistry:", registryAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

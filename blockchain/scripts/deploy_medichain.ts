import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
    const MediChainRecords = await ethers.getContractFactory("MediChainRecords");
    const contract = await MediChainRecords.deploy();
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    fs.writeFileSync("deployed_address.txt", address);
    console.log("Saved address to deployed_address.txt");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
